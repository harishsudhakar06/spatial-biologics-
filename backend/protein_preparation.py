import os
os.environ["PATH"] += r";C:\Program Files\OpenBabel-3.1.1"
import glob
import subprocess
import pandas as pd
import numpy as np
from pdbfixer import PDBFixer
from openmm.app import PDBFile
from Bio.PDB import PDBParser

def repair_pdb(input_pdb, output_pdb):
    fixer = PDBFixer(filename=input_pdb)
    fixer.removeHeterogens(keepWater=False)
    fixer.findMissingResidues()
    fixer.findMissingAtoms()
    fixer.addMissingAtoms()
    with open(output_pdb, 'w') as f:
        PDBFile.writeFile(fixer.topology, fixer.positions, f)

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

PROTEIN_DIR = "proteins"
RESULT_DIR = "results"
PH = 7.4

for protein in glob.glob(os.path.join(PROTEIN_DIR, "*.pdb")):

    if "_fixed" in protein:
        continue

    protein_name = os.path.basename(protein).replace(".pdb", "")
    print(f"\nProcessing Protein: {protein_name}")

    fixed_pdb = os.path.join(PROTEIN_DIR, protein_name + "_fixed.pdb")
    repair_pdb(protein, fixed_pdb)

    coords = run_fpocket(fixed_pdb)
    if coords:
        cx, cy, cz = coords
        print("Pocket detected via Fpocket")
    else:
        cx, cy, cz = fallback_center(fixed_pdb)
        print("Center of mass used.")

    # Protein repair only
    print(f"[SUCCESS] Repaired protein: {protein_name}_fixed.pdb")
