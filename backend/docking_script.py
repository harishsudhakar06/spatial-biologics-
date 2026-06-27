import os
os.environ["PATH"] += r";C:\Program Files\OpenBabel-3.1.1"
VINA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vina.exe")
import glob
import subprocess
import pandas as pd
import numpy as np
from Bio.PDB import PDBParser

PROTEIN_DIR    = "proteins"
RESULT_DIR     = "results"
EXHAUSTIVENESS = 32
NUM_MODES      = 20
SEED           = 12345
GRID_SIZE      = 25

os.makedirs(RESULT_DIR, exist_ok=True)

def run_fpocket(protein_pdb):
    base = os.path.splitext(protein_pdb)[0]
    subprocess.run(f"fpocket -f {protein_pdb}", shell=True)
    info_file = base + "_out/" + os.path.basename(base) + "_info.txt"
    if os.path.exists(info_file):
        try:
            df = pd.read_csv(info_file, sep=None, engine="python", comment="#")
            return df.iloc[0]["center_x"], df.iloc[0]["center_y"], df.iloc[0]["center_z"]
        except:
            return None
    return None

def fallback_center(protein_pdb):
    parser = PDBParser(QUIET=True)
    structure = parser.get_structure("prot", protein_pdb)
    coords = [atom.coord for atom in structure.get_atoms() if atom.element != "H"]
    coords = np.array(coords)
    center = coords.mean(axis=0)
    return center[0], center[1], center[2]

# ── Find prepared receptors ──
protein_files       = glob.glob(os.path.join(PROTEIN_DIR, "*.pdb"))
prepared_receptors  = []
for pf in protein_files:
    if "_fixed" in pf:
        continue
    protein_name   = os.path.basename(pf).replace(".pdb", "")
    receptor_pdbqt = os.path.join(RESULT_DIR, protein_name + ".pdbqt")
    fixed_pdb      = os.path.join(PROTEIN_DIR, protein_name + "_fixed.pdb")
    if os.path.exists(receptor_pdbqt):
        prepared_receptors.append((protein_name, receptor_pdbqt, fixed_pdb))

# ── Find prepared ligands ──
ligand_files      = glob.glob(os.path.join("ligands", "*.sdf"))
prepared_ligands  = []
for lf in ligand_files:
    if "_fixed" in lf:
        continue
    lig_name     = os.path.basename(lf).replace(".sdf", "")
    ligand_pdbqt = os.path.join(RESULT_DIR, lig_name + ".pdbqt")
    if os.path.exists(ligand_pdbqt):
        prepared_ligands.append((lig_name, ligand_pdbqt))

if not prepared_receptors or not prepared_ligands:
    print("[ERROR] Missing prepared files. Make sure protein and ligand are prepared.")
    exit(1)

print(f"Found {len(prepared_receptors)} receptors and {len(prepared_ligands)} ligands.")

for protein_name, receptor_pdbqt, fixed_pdb in prepared_receptors:
    print(f"\nReceptor: {protein_name}")

    # Get active site coordinates
    coords = run_fpocket(fixed_pdb)
    if coords:
        cx, cy, cz = coords
        print("Pocket coordinates detected via Fpocket")
    else:
        cx, cy, cz = fallback_center(fixed_pdb)
        print("Center of mass coordinates used as fallback")

    for lig_name, ligand_pdbqt in prepared_ligands:
        print(f"  Docking Ligand: {lig_name}")

        out_file = os.path.join(RESULT_DIR, f"{protein_name}_{lig_name}_out.pdbqt")
        log_file = os.path.join(RESULT_DIR, f"{protein_name}_{lig_name}.log")

        # ── THIS WAS THE BUG: broken f-string across lines ──
        # Build the command as a plain list passed to subprocess — no shell quoting issues
        vina_cmd = [
            VINA_PATH,
            "--receptor",      receptor_pdbqt,
            "--ligand",        ligand_pdbqt,
            "--center_x",      f"{cx:.2f}",
            "--center_y",      f"{cy:.2f}",
            "--center_z",      f"{cz:.2f}",
            "--size_x",        str(GRID_SIZE),
            "--size_y",        str(GRID_SIZE),
            "--size_z",        str(GRID_SIZE),
            "--exhaustiveness", str(EXHAUSTIVENESS),
            "--num_modes",     str(NUM_MODES),
            "--seed",          str(SEED),
            "--out",           out_file,
        ]

        print(f"  Running Vina for {protein_name} + {lig_name}...")

        with open(log_file, "w") as log_f:
            vina_run = subprocess.run(
                vina_cmd,
                stdout=log_f,
                stderr=subprocess.STDOUT,
            )

        if vina_run.returncode != 0 or not os.path.exists(out_file):
            print(f"  [ERROR] Docking failed for {lig_name}")
            # Print log so the error is visible in the UI stream
            if os.path.exists(log_file):
                with open(log_file) as lf:
                    print(lf.read())
        else:
            print(f"  [SUCCESS] Docking completed: outputs saved to results/")
            # Print binding affinities from log
            if os.path.exists(log_file):
                with open(log_file) as lf:
                    for line in lf:
                        if line.strip() and (line.strip()[0].isdigit() or "mode" in line.lower() or "affinity" in line.lower()):
                            print(f"    {line.rstrip()}")

print("\n======================================")
print("ACTIVE SITE DOCKING PIPELINE FINISHED")
print("======================================")