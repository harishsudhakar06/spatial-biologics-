import os
import glob
import subprocess
import pandas as pd
import xml.etree.ElementTree as ET
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from collections import defaultdict
from pdbfixer import PDBFixer
from openmm.app import PDBFile
from Bio.PDB import PDBParser

# ===================== CONFIG ===================== #

PROTEIN_DIR = "proteins"
LIGAND_DIR = "ligands"
RESULT_DIR = "results"

PH = 7.4
GRID_SIZE = 25
EXHAUSTIVENESS = 32
NUM_MODES = 20
SEED = 12345

os.makedirs(PROTEIN_DIR, exist_ok=True)
os.makedirs(LIGAND_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

print("======================================")
print("ULTIMATE DOCKING + POST ANALYSIS PIPELINE")
print("======================================")

# ===================== STORAGE ===================== #

energy_records = []
atom_interactions = []
interaction_matrix = defaultdict(lambda: defaultdict(int))

failed_ligands = []
skipped_ligands = []

# ===================== UTILITIES ===================== #

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

# ===================== MAIN DOCKING ===================== #

# ✅ Only take ORIGINAL ligand files
all_sdfs = glob.glob(os.path.join(LIGAND_DIR, "*.sdf"))

original_ligands = [
    f for f in all_sdfs
    if "_fixed" not in os.path.basename(f)
    and "test" not in os.path.basename(f)
]

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

    receptor_pdbqt = os.path.join(RESULT_DIR, protein_name + ".pdbqt")
    subprocess.run(
        f"obabel {fixed_pdb} -O {receptor_pdbqt} -p {PH} -xr -at",
        shell=True
    )

    for sdf in original_ligands:

        lig_name = os.path.basename(sdf).replace(".sdf", "")
        print(f"Docking Ligand: {lig_name}")

        ligand_pdbqt = os.path.join(RESULT_DIR, lig_name + ".pdbqt")

        out_file = os.path.join(
            RESULT_DIR,
            protein_name + "_" + lig_name + "_out.pdbqt"
        )

        log_file = os.path.join(
            RESULT_DIR,
            protein_name + "_" + lig_name + ".log"
        )

        # Skip already completed
        if os.path.exists(out_file) and os.path.exists(log_file):
            print(f"[SKIPPED] {protein_name} - {lig_name}")
            skipped_ligands.append(lig_name)
            continue

        # ==========================================
        # ✅ FIX LIGAND WITH ROBUST FALLBACKS
        # ==========================================
        fixed_sdf = os.path.join(LIGAND_DIR, lig_name + "_fixed.sdf")

        if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
            print(f"[INFO] Preparing ligand: {lig_name}")

            # Attempt 1: High-quality 3D generation with MMFF94
            fix_cmd_1 = f'obabel -isdf "{sdf}" -osdf -O "{fixed_sdf}" -h --gen3d --minimize --ff MMFF94 --steps 2500'
            subprocess.run(fix_cmd_1, shell=True, stderr=subprocess.DEVNULL)

            # Attempt 2: Fallback to UFF Force Field (More universal)
            if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
                print(f"  [WARNING] MMFF94 failed for {lig_name}. Trying UFF...")
                fix_cmd_2 = f'obabel -isdf "{sdf}" -osdf -O "{fixed_sdf}" -h --gen3d --minimize --ff UFF --steps 2500'
                subprocess.run(fix_cmd_2, shell=True, stderr=subprocess.DEVNULL)

            # Attempt 3: Fallback to the original script's basic method
            if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
                print(f"  [WARNING] UFF failed for {lig_name}. Falling back to basic 3D generation...")
                fix_cmd_3 = f'obabel -isdf "{sdf}" -osdf -O "{fixed_sdf}" -r --gen3d'
                subprocess.run(fix_cmd_3, shell=True, stderr=subprocess.DEVNULL)

            # Final check to ensure we actually got a valid file
            if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
                print(f"[ERROR] All 3D generation attempts failed for: {lig_name}")
                failed_ligands.append(lig_name)
                continue
                
            # Optional: Check for stereochemistry warnings
            check_cmd = f'obabel "{fixed_sdf}" -osmi'
            check_run = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
            if "@" not in check_run.stdout:
                print(f"  [INFO] Note: No stereocenters detected (or unresolved) in {lig_name}")
        else:
            print(f"[INFO] Using existing fixed ligand: {lig_name}")

        # ✅ CONVERT TO PDBQT
        conv_run = subprocess.run(
            f'obabel -isdf "{fixed_sdf}" -opdbqt -O "{ligand_pdbqt}" -p {PH}',
            shell=True
        )

        if conv_run.returncode != 0 or not os.path.exists(ligand_pdbqt):
            print(f"[ERROR] Conversion failed: {lig_name}")
            failed_ligands.append(lig_name)
            continue

        if os.path.getsize(ligand_pdbqt) < 100:
            print(f"[ERROR] Empty PDBQT: {lig_name}")
            failed_ligands.append(lig_name)
            continue

        # ✅ DOCK
        vina_cmd = (
            f"vina --receptor {receptor_pdbqt} "
            f"--ligand {ligand_pdbqt} "
            f"--center_x {cx} --center_y {cy} --center_z {cz} "
            f"--size_x {GRID_SIZE} --size_y {GRID_SIZE} --size_z {GRID_SIZE} "
            f"--exhaustiveness {EXHAUSTIVENESS} "
            f"--num_modes {NUM_MODES} "
            f"--seed {SEED} "
            f"--out {out_file} "
            f"> {log_file} 2>&1"
        )

        vina_run = subprocess.run(vina_cmd, shell=True)

        if vina_run.returncode != 0 or not os.path.exists(out_file):
            print(f"[ERROR] Docking failed: {protein_name} - {lig_name}")
            failed_ligands.append(lig_name)
            continue

# ===================== LOG PARSING ===================== #

print("\nParsing docking logs...")

for logfile in glob.glob(os.path.join(RESULT_DIR, "*.log")):

    complex_name = os.path.basename(logfile).replace(".log", "")

    with open(logfile) as f:
        capture = False
        for line in f:
            if line.strip().startswith("mode"):
                capture = True
                continue
            if capture:
                parts = line.split()
                if len(parts) >= 2 and parts[0].isdigit():
                    energy_records.append([
                        complex_name,
                        int(parts[0]),
                        float(parts[1])
                    ])

energy_df = pd.DataFrame(
    energy_records,
    columns=["Complex", "Pose", "BindingEnergy(kcal/mol)"]
)

# ===================== ORIGINAL POST DOCKING ANALYSIS (UNCHANGED) ===================== #

best_df = energy_df.loc[
    energy_df.groupby("Complex")["BindingEnergy(kcal/mol)"].idxmin()
].copy()

ranking_df = energy_df.sort_values("BindingEnergy(kcal/mol)")

best_df["Protein"] = best_df["Complex"].str.split("_").str[0]

top_protein_df = best_df.loc[
    best_df.groupby("Protein")["BindingEnergy(kcal/mol)"].idxmin()
]

best_df["Ligand"] = best_df["Complex"].str.split("_").str[1]
best_df["LigandEfficiency"] = best_df["BindingEnergy(kcal/mol)"] / 25

# ===================== MD READY COMPLEX CREATION ===================== #

print("\nGenerating Best Pose Complex PDB files for MD...")

complex_output_dir = os.path.join(RESULT_DIR, "Complexes_for_MD")
os.makedirs(complex_output_dir, exist_ok=True)

for _, row in best_df.iterrows():

    complex_name = row["Complex"]
    protein_name = row["Protein"]
    pose_number = int(row["Pose"])

    fixed_receptor = os.path.join(PROTEIN_DIR, protein_name + "_fixed.pdb")
    docked_pdbqt = os.path.join(RESULT_DIR, complex_name + "_out.pdbqt")

    if not os.path.exists(docked_pdbqt):
        continue

    best_pose_pdbqt = os.path.join(
        complex_output_dir,
        complex_name + "_best_pose.pdbqt"
    )

    subprocess.run(
        f"obabel {docked_pdbqt} -O {best_pose_pdbqt} -f {pose_number} -l {pose_number}",
        shell=True
    )

    best_ligand_pdb = os.path.join(
        complex_output_dir,
        complex_name + "_ligand.pdb"
    )

    subprocess.run(
        f"obabel {best_pose_pdbqt} -O {best_ligand_pdb}",
        shell=True
    )

    final_complex_pdb = os.path.join(
        complex_output_dir,
        complex_name + "_complex.pdb"
    )

    with open(final_complex_pdb, "w") as outfile:

        with open(fixed_receptor) as r:
            for line in r:
                if line.startswith(("ATOM", "TER")):
                    outfile.write(line)

        outfile.write("TER\n")

        with open(best_ligand_pdb) as l:
            for line in l:
                if line.startswith(("ATOM", "HETATM")):
                    line = line.replace("ATOM  ", "HETATM")
                    line = line[:17] + "LIG" + line[20:]
                    outfile.write(line)

        outfile.write("END\n")

print("Best pose complex PDB files generated.")

# ===================== PLIP ANALYSIS (CLEAN PARSING) ===================== #

print("Running PLIP...")

for complex_file in glob.glob(os.path.join(complex_output_dir, "*_complex.pdb")):

    complex_name = os.path.basename(complex_file).replace("_complex.pdb", "")
    plip_out = os.path.join(RESULT_DIR, complex_name + "_plip")

    subprocess.run(
        f"plip -f {complex_file} -o {plip_out} --xml --pics",
        shell=True
    )

    xml_files = glob.glob(os.path.join(plip_out, "*.xml"))

    if not xml_files:
        print(f"PLIP failed for {complex_name}")
        continue

    xml_file = xml_files[0]

    tree = ET.parse(xml_file)
    root = tree.getroot()

    for interaction_type in ["hydrogen_bond", "hydrophobic_interaction", "pi_stack", "salt_bridge"]:

        for interaction in root.findall(f".//{interaction_type}"):

            res_type = interaction.findtext("restype")
            res_num = interaction.findtext("resnr")
            lig_atom = interaction.findtext("ligatom")
            prot_atom = interaction.findtext("protatom")
            distance = interaction.findtext("distance")

            atom_interactions.append([
                complex_name,
                interaction_type,
                res_type,
                res_num,
                lig_atom,
                prot_atom,
                distance
            ])

            residue_id = f"{res_type}_{res_num}"
            interaction_matrix[residue_id][complex_name] += 1

# ===================== PLOTS ===================== #

plt.figure(figsize=(8,6))
sns.histplot(energy_df["BindingEnergy(kcal/mol)"], bins=20, kde=True)
plt.title("Binding Energy Distribution")
plt.savefig(os.path.join(RESULT_DIR, "Energy_Histogram.png"))
plt.close()

plt.figure(figsize=(8,6))
sns.barplot(
    x="BindingEnergy(kcal/mol)",
    y="Complex",
    data=ranking_df.head(15)
)
plt.title("Top 15 Ranked Complexes")
plt.tight_layout()
plt.savefig(os.path.join(RESULT_DIR, "Energy_Ranking.png"))
plt.close()

if interaction_matrix:
    heatmap_df = pd.DataFrame(interaction_matrix).fillna(0)
    plt.figure(figsize=(12,8))
    sns.heatmap(heatmap_df, cmap="Blues", annot=True)
    plt.title("Interaction Matrix")
    plt.tight_layout()
    plt.savefig(os.path.join(RESULT_DIR, "Interaction_Heatmap.png"))
    plt.close()
else:
    heatmap_df = pd.DataFrame()

# ===================== EXCEL REPORT ===================== #

with pd.ExcelWriter(os.path.join(RESULT_DIR, "Master_Docking_Report.xlsx")) as writer:

    energy_df.to_excel(writer, sheet_name="All_Poses", index=False)
    best_df.to_excel(writer, sheet_name="Best_Per_Complex", index=False)
    ranking_df.to_excel(writer, sheet_name="Global_Ranking", index=False)
    top_protein_df.to_excel(writer, sheet_name="Top_Per_Protein", index=False)

    pd.DataFrame(
        atom_interactions,
        columns=[
            "Complex",
            "Interaction_Type",
            "Residue_Type",
            "Residue_Number",
            "Ligand_Atom",
            "Protein_Atom",
            "Distance"
        ]
    ).to_excel(writer, sheet_name="Atom_Interactions", index=False)

    heatmap_df.to_excel(writer, sheet_name="Interaction_Matrix")

print("\n======================================")
print("COMPLETE DOCKING PIPELINE FINISHED")
print("======================================")