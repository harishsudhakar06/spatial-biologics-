import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

os.environ["BABEL_DATADIR"] = r"C:\Program Files\OpenBabel-3.1.1\data"
os.environ["PATH"] += r";C:\Program Files\OpenBabel-3.1.1"

import glob
import subprocess

PROTEIN_DIR = "proteins"
LIGAND_DIR  = "ligands"
RESULT_DIR  = "results"
PH = 7.4

os.makedirs(RESULT_DIR, exist_ok=True)

def run_cmd(cmd):
    print(f"  CMD: {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.stdout.strip():
        print(f"  stdout: {result.stdout.strip()}")
    if result.stderr.strip():
        print(f"  stderr: {result.stderr.strip()}")
    return result

def check_pdbqt_support():
    try:
        test = subprocess.run(["obabel", "-L", "formats"],
                              capture_output=True, text=True, encoding='utf-8', errors='replace')
        return "pdbqt" in test.stdout.lower()
    except Exception:
        return False

def has_meeko():
    try:
        import meeko
        return True
    except ImportError:
        return False

def has_openbabel_python():
    try:
        from openbabel import openbabel
        return True
    except ImportError:
        return False

OBABEL_HAS_PDBQT    = check_pdbqt_support()
MEEKO_AVAILABLE     = has_meeko()
OPENBABEL_PYTHON    = has_openbabel_python()

print(f"  obabel PDBQT support:   {OBABEL_HAS_PDBQT}")
print(f"  openbabel Python pkg:   {OPENBABEL_PYTHON}")
print(f"  meeko available:        {MEEKO_AVAILABLE}")
if not MEEKO_AVAILABLE and not OPENBABEL_PYTHON:
    print("  [WARN] Run: pip install openbabel-wheel meeko rdkit")

# ─────────────────────────────────────────────────────────
# Method: openbabel Python API (pip install openbabel-wheel)
# Most reliable — same engine as obabel CLI, always has PDBQT
# ─────────────────────────────────────────────────────────
def convert_via_openbabel_python(input_file, output_file, in_format, out_format, pH=7.4, rigid=False):
    try:
        from openbabel import openbabel as ob

        obConversion = ob.OBConversion()
        obConversion.SetInAndOutFormats(in_format, out_format)

        mol = ob.OBMol()
        obConversion.ReadFile(mol, input_file)

        if mol.NumAtoms() == 0:
            print(f"  [ERROR] No atoms read from {input_file}")
            return False

        # Add hydrogens at given pH
        mol.AddHydrogens(False, True, pH)

        if rigid:
            # For receptor: mark all bonds as non-rotatable
            obConversion.AddOption("r", ob.OBConversion.OUTOPTIONS)

        obConversion.WriteFile(mol, output_file)
        return os.path.exists(output_file) and os.path.getsize(output_file) > 0

    except Exception as e:
        print(f"  openbabel Python API failed: {e}")
        return False

# ─────────────────────────────────────────────────────────
# AutoDock atom type map (case-sensitive — Vina is strict)
# ─────────────────────────────────────────────────────────
ELEMENT_TO_ADTYPE = {
    "C":  "C",  "N":  "N",  "O":  "OA", "S":  "SA",
    "H":  "HD", "P":  "P",  "F":  "F",  "CL": "Cl",
    "BR": "Br", "I":  "I",  "MG": "Mg", "MN": "Mn",
    "ZN": "Zn", "CA": "Ca", "FE": "Fe", "NA": "NA",
    "K":  "K",  "SE": "Se",
}

def get_element_from_pdb_line(line):
    element = line[76:78].strip() if len(line) > 76 else ""
    if not element:
        atom_name = line[12:16].strip()
        letters = ''.join(c for c in atom_name if c.isalpha())
        element = letters[0] if letters else "C"
    return element.upper()

def get_ad_type(element):
    return ELEMENT_TO_ADTYPE.get(element.upper(), "C")

def format_pdbqt_atom_line(pdb_line, charge=0.000):
    """
    Write a PDBQT atom line with correct column positions.
    Vina expects:
      cols 1-66:  standard PDB columns
      cols 67-76: partial charge  e.g. '    0.000'
      cols 77-79: AutoDock type   e.g. ' C '
    """
    rec = pdb_line[:6]
    try:
        x = float(pdb_line[30:38])
        y = float(pdb_line[38:46])
        z = float(pdb_line[46:54])
    except (ValueError, IndexError):
        return None

    try:
        occupancy = float(pdb_line[54:60])
    except (ValueError, IndexError):
        occupancy = 1.00
    try:
        bfactor = float(pdb_line[60:66])
    except (ValueError, IndexError):
        bfactor = 0.00

    serial  = pdb_line[6:11]
    name    = pdb_line[12:16]
    alt     = pdb_line[16:17] if len(pdb_line) > 16 else " "
    resname = pdb_line[17:20] if len(pdb_line) > 20 else "UNK"
    chain   = pdb_line[21:22] if len(pdb_line) > 22 else "A"
    resseq  = pdb_line[22:26] if len(pdb_line) > 26 else "   1"
    icode   = pdb_line[26:27] if len(pdb_line) > 27 else " "

    element = get_element_from_pdb_line(pdb_line)
    ad_type = get_ad_type(element)

    # Build line matching exact Vina PDBQT spec
    line = (
        f"{rec}"
        f"{serial}"
        f" {name}"
        f"{alt}"
        f"{resname} "
        f"{chain}"
        f"{resseq}"
        f"{icode}   "
        f"{x:8.3f}{y:8.3f}{z:8.3f}"
        f"{occupancy:6.2f}{bfactor:6.2f}"
        f"    {charge:6.3f} {ad_type:<2}"
    )
    return line

# ─────────────────────────────────────────────────────────
# Pure Python PDB -> PDBQT fallback
# ─────────────────────────────────────────────────────────
def pdb_to_pdbqt_text(input_pdb, output_pdbqt):
    try:
        with open(input_pdb, "r", encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        pdbqt_lines = []
        for line in lines:
            rec = line[:6].strip()
            if rec in ("ATOM", "HETATM"):
                formatted = format_pdbqt_atom_line(line)
                if formatted:
                    pdbqt_lines.append(formatted + "\n")
            elif rec in ("TER", "END"):
                pdbqt_lines.append(line)

        if not pdbqt_lines:
            print("  [WARN] No ATOM/HETATM lines found in PDB.")
            return False

        with open(output_pdbqt, "w", encoding='utf-8') as f:
            f.writelines(pdbqt_lines)

        size = os.path.getsize(output_pdbqt)
        print(f"  Written {len(pdbqt_lines)} lines ({size} bytes)")
        return size > 0

    except Exception as e:
        print(f"  [ERROR] pdb_to_pdbqt_text failed: {e}")
        return False

# ─────────────────────────────────────────────────────────
# Pure Python SDF -> PDBQT fallback
# ─────────────────────────────────────────────────────────
def sdf_to_pdbqt_text(input_sdf, output_pdbqt):
    # Try RDKit first
    try:
        from rdkit import Chem
        from rdkit.Chem import AllChem

        mol = Chem.MolFromMolFile(input_sdf, removeHs=False)
        if mol is None:
            mol = Chem.MolFromMolFile(input_sdf, removeHs=True)
            if mol:
                mol = Chem.AddHs(mol)
                AllChem.EmbedMolecule(mol, AllChem.ETKDGv3())
                AllChem.MMFFOptimizeMolecule(mol)

        if mol and mol.GetNumConformers() > 0:
            conf = mol.GetConformer()
            pdbqt_lines = ["ROOT\n"]
            for i, atom in enumerate(mol.GetAtoms()):
                pos     = conf.GetAtomPosition(i)
                symbol  = atom.GetSymbol().upper()
                ad_type = get_ad_type(symbol)
                line = (
                    f"ATOM  {i+1:5d}  {symbol:<3} LIG A   1    "
                    f"{pos.x:8.3f}{pos.y:8.3f}{pos.z:8.3f}"
                    f"  1.00  0.00"
                    f"    {0.000:6.3f} {ad_type:<2}"
                )
                pdbqt_lines.append(line + "\n")
            pdbqt_lines += ["ENDROOT\n", "TORSDOF 0\n"]
            with open(output_pdbqt, "w", encoding='utf-8') as f:
                f.writelines(pdbqt_lines)
            print("  RDKit conversion succeeded.")
            return os.path.getsize(output_pdbqt) > 0

    except ImportError:
        print("  RDKit not available, using basic SDF parser...")
    except Exception as e:
        print(f"  RDKit failed: {e}")

    # Basic SDF parser fallback
    try:
        with open(input_sdf, "r", encoding='utf-8', errors='replace') as f:
            content = f.read()

        blocks    = content.split("$$$$")
        mol_lines = blocks[0].strip().splitlines()

        if len(mol_lines) < 4:
            return False

        try:
            num_atoms = int(mol_lines[3][:3].strip())
        except ValueError:
            return False

        atom_lines  = mol_lines[4:4 + num_atoms]
        pdbqt_lines = ["ROOT\n"]

        for i, al in enumerate(atom_lines):
            parts = al.split()
            if len(parts) < 4:
                continue
            try:
                x, y, z = float(parts[0]), float(parts[1]), float(parts[2])
            except ValueError:
                continue
            symbol  = parts[3].upper()
            ad_type = get_ad_type(symbol)
            line = (
                f"ATOM  {i+1:5d}  {symbol:<3} LIG A   1    "
                f"{x:8.3f}{y:8.3f}{z:8.3f}"
                f"  1.00  0.00"
                f"    {0.000:6.3f} {ad_type:<2}"
            )
            pdbqt_lines.append(line + "\n")

        pdbqt_lines += ["ENDROOT\n", "TORSDOF 0\n"]
        with open(output_pdbqt, "w", encoding='utf-8') as f:
            f.writelines(pdbqt_lines)
        print("  Basic SDF parser succeeded.")
        return os.path.getsize(output_pdbqt) > 0

    except Exception as e:
        print(f"  [ERROR] Basic SDF parser failed: {e}")
        return False


# ─────────────────────────────────────────────────────────
# 1. Convert proteins
# ─────────────────────────────────────────────────────────
fixed_proteins = glob.glob(os.path.join(PROTEIN_DIR, "*_fixed.pdb"))
print(f"\nFound {len(fixed_proteins)} fixed proteins for conversion.")

for fp in fixed_proteins:
    prot_name      = os.path.basename(fp).replace("_fixed.pdb", "")
    receptor_pdbqt = os.path.join(RESULT_DIR, f"{prot_name}.pdbqt")
    success        = False

    print(f"Converting protein {prot_name} to PDBQT...")

    # Method 1: openbabel Python package (pip install openbabel-wheel)
    if OPENBABEL_PYTHON and not success:
        print("  Trying openbabel Python API...")
        if convert_via_openbabel_python(fp, receptor_pdbqt, "pdb", "pdbqt", pH=PH, rigid=True):
            success = True
            print("  openbabel Python API succeeded.")

    # Method 2: obabel CLI
    if OBABEL_HAS_PDBQT and not success:
        r = run_cmd(["obabel", "-ipdb", fp, "-opdbqt", "-O", receptor_pdbqt, f"-p{PH}", "-xr"])
        if r.returncode == 0 and os.path.exists(receptor_pdbqt):
            success = True

    # Method 3: meeko
    if MEEKO_AVAILABLE and not success:
        r = run_cmd(["mk_prepare_receptor", "-i", fp, "-o", receptor_pdbqt, "--pH", str(PH)])
        if r.returncode == 0 and os.path.exists(receptor_pdbqt):
            success = True

    # Method 4: MGLTools
    if not success:
        for script_path in [
            r"C:\Program Files (x86)\MGLTools-1.5.7\Lib\site-packages\AutoDockTools\Utilities24\prepare_receptor4.py",
            r"C:\MGLTools-1.5.7\Lib\site-packages\AutoDockTools\Utilities24\prepare_receptor4.py",
        ]:
            if os.path.exists(script_path):
                r = run_cmd(["python", script_path, "-r", fp, "-o", receptor_pdbqt, "-A", "hydrogens"])
                if r.returncode == 0 and os.path.exists(receptor_pdbqt):
                    success = True
                    break

    # Method 5: Pure Python fallback
    if not success:
        print(f"  Trying pure Python PDB->PDBQT conversion...")
        if pdb_to_pdbqt_text(fp, receptor_pdbqt):
            success = True
            print(f"  Pure Python fallback succeeded.")

    if success:
        print(f"[SUCCESS] Converted protein to: {receptor_pdbqt}")
    else:
        print(f"[ERROR] Failed to convert protein: {prot_name}")
        print(f"  Fix: pip install openbabel-wheel")


# ─────────────────────────────────────────────────────────
# 2. Convert ligands
# ─────────────────────────────────────────────────────────
fixed_ligands = glob.glob(os.path.join(LIGAND_DIR, "*_fixed.sdf"))
print(f"\nFound {len(fixed_ligands)} fixed ligands for conversion.")

for fl in fixed_ligands:
    lig_name     = os.path.basename(fl).replace("_fixed.sdf", "")
    ligand_pdbqt = os.path.join(RESULT_DIR, f"{lig_name}.pdbqt")
    success      = False

    print(f"Converting ligand {lig_name} to PDBQT...")

    # Method 1: openbabel Python package
    if OPENBABEL_PYTHON and not success:
        print("  Trying openbabel Python API...")
        if convert_via_openbabel_python(fl, ligand_pdbqt, "sdf", "pdbqt", pH=PH, rigid=False):
            success = True
            print("  openbabel Python API succeeded.")

    # Method 2: obabel CLI
    if OBABEL_HAS_PDBQT and not success:
        r = run_cmd(["obabel", "-isdf", fl, "-opdbqt", "-O", ligand_pdbqt, f"-p{PH}", "--gen3d"])
        if r.returncode == 0 and os.path.exists(ligand_pdbqt):
            success = True

    # Method 3: meeko CLI
    if MEEKO_AVAILABLE and not success:
        r = run_cmd(["mk_prepare_ligand", "-i", fl, "-o", ligand_pdbqt])
        if r.returncode == 0 and os.path.exists(ligand_pdbqt):
            success = True

    # Method 4: meeko Python API
    if MEEKO_AVAILABLE and not success:
        try:
            from meeko import MoleculePreparation
            from rdkit import Chem
            from rdkit.Chem import AllChem
            mol = Chem.MolFromMolFile(fl, removeHs=False)
            if mol is None:
                mol = Chem.AddHs(Chem.MolFromMolFile(fl, removeHs=True))
                AllChem.EmbedMolecule(mol, AllChem.ETKDGv3())
                AllChem.MMFFOptimizeMolecule(mol)
            preparator   = MoleculePreparation()
            preparator.prepare(mol)
            pdbqt_string = preparator.write_pdbqt_string()
            with open(ligand_pdbqt, "w", encoding='utf-8') as f:
                f.write(pdbqt_string)
            if os.path.exists(ligand_pdbqt) and os.path.getsize(ligand_pdbqt) > 0:
                success = True
        except Exception as e:
            print(f"  meeko API failed: {e}")

    # Method 5: MGLTools
    if not success:
        for script_path in [
            r"C:\Program Files (x86)\MGLTools-1.5.7\Lib\site-packages\AutoDockTools\Utilities24\prepare_ligand4.py",
            r"C:\MGLTools-1.5.7\Lib\site-packages\AutoDockTools\Utilities24\prepare_ligand4.py",
        ]:
            if os.path.exists(script_path):
                r = run_cmd(["python", script_path, "-l", fl, "-o", ligand_pdbqt])
                if r.returncode == 0 and os.path.exists(ligand_pdbqt):
                    success = True
                    break

    # Method 6: Pure Python fallback
    if not success:
        print(f"  Trying pure Python SDF->PDBQT conversion...")
        if sdf_to_pdbqt_text(fl, ligand_pdbqt):
            success = True
            print(f"  Pure Python fallback succeeded.")

    if success:
        print(f"[SUCCESS] Converted ligand to: {ligand_pdbqt}")
    else:
        print(f"[ERROR] Failed to convert ligand: {lig_name}")
        print(f"  Fix: pip install openbabel-wheel")

print("\n======================================")
print("FILE CONVERSION PIPELINE FINISHED")
print("======================================")