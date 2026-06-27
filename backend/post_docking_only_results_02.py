import os
import glob
import subprocess
import pandas as pd
import xml.etree.ElementTree as ET
from collections import defaultdict

# ===================== CONFIG ===================== #

PROTEIN_DIR = "proteins"
LIGAND_DIR = "ligands"
RESULT_DIR = "results"
TOP_N_POSES = 3

print("======================================")
print("ULTIMATE DOCKING + TOP N PLIP ANALYSIS")
print("======================================")

# ===================== STORAGE ===================== #

energy_records = []
atom_interactions = []
interaction_matrix = defaultdict(lambda: defaultdict(int))

# ===================== LOAD LIGAND NAMES SAFELY ===================== #

ligand_files = glob.glob(os.path.join(LIGAND_DIR, "*.sdf"))
ligand_names = [os.path.basename(x).replace(".sdf", "") for x in ligand_files]

if not ligand_names:
    print("No ligand files found in ligands/ folder.")
    exit()

# ===================== SAFE SPLIT FUNCTION ===================== #

def split_complex_name(complex_name):
    """
    Safely split complex name using known ligand names.
    Handles ligands with underscores (e.g., bet_sitosterol).
    """
    for lig in ligand_names:
        if complex_name.endswith("_" + lig):
            protein = complex_name[:-(len(lig) + 1)]
            return protein, lig
    return None, None

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
    columns=["Complex", "Pose", "BindingEnergy"]
)

if energy_df.empty:
    print("No docking results found.")
    exit()

# Safe y extract Protein and Ligand
proteins = []
ligands = []

for complex_name in energy_df["Complex"]:
    protein, ligand = split_complex_name(complex_name)
    proteins.append(protein)
    ligands.append(ligand)

energy_df["Protein"] = proteins
energy_df["Ligand"] = ligands

# Remove any failed splits
energy_df = energy_df.dropna()

energy_df = energy_df.sort_values(
    ["Complex", "BindingEnergy"]
)

top_df = energy_df.groupby("Complex").head(TOP_N_POSES).copy()

print("Total complexes found:", top_df["Complex"].nunique())

# ===================== COMPLEX GENERATION ===================== #

complex_output_dir = os.path.join(RESULT_DIR, "TopN_Complexes")
os.makedirs(complex_output_dir, exist_ok=True)

print("\nGenerating Top N pose complexes...")

for _, row in top_df.iterrows():

    complex_name = row["Complex"]
    protein = row["Protein"]
    ligand = row["Ligand"]
    pose_number = int(row["Pose"])

    docked_pdbqt = os.path.join(
        RESULT_DIR, complex_name + "_out.pdbqt"
    )

    if not os.path.exists(docked_pdbqt):
        print("Missing docked file:", docked_pdbqt)
        continue

    receptor_files = glob.glob(
        os.path.join(PROTEIN_DIR, protein + "*_fixed.pdb")
    )

    if not receptor_files:
        print("Missing receptor for:", protein)
        continue

    fixed_receptor = receptor_files[0]

    pose_tag = f"{complex_name}_pose{pose_number}"

    best_pose_pdbqt = os.path.join(
        complex_output_dir, pose_tag + ".pdbqt"
    )

    subprocess.run(
        f"obabel {docked_pdbqt} -O {best_pose_pdbqt} "
        f"-f {pose_number} -l {pose_number}",
        shell=True
    )

    ligand_pdb = os.path.join(
        complex_output_dir, pose_tag + "_ligand.pdb"
    )

    subprocess.run(
        f"obabel {best_pose_pdbqt} -O {ligand_pdb}",
        shell=True
    )

    final_complex = os.path.join(
        complex_output_dir, pose_tag + "_complex.pdb"
    )

    with open(final_complex, "w") as outfile:

        with open(fixed_receptor) as r:
            for line in r:
                if line.startswith(("ATOM", "TER")):
                    outfile.write(line)

        outfile.write("TER\n")

        with open(ligand_pdb) as l:
            for line in l:
                if line.startswith(("ATOM", "HETATM")):
                    line = line[:17] + "LIG" + line[20:]
                    outfile.write(line)

        outfile.write("END\n")

print("Top complexes generated.")

# ===================== PLIP ===================== #

print("\nRunning PLIP on all Top N complexes...")

for complex_file in glob.glob(
    os.path.join(complex_output_dir, "*_complex.pdb")
):

    filename = os.path.basename(complex_file).replace("_complex.pdb", "")

    base, pose_number = filename.rsplit("_pose", 1)

    protein, ligand = split_complex_name(base)

    if protein is None:
        print("PLIP split error:", filename)
        continue

    plip_out = os.path.join(
        RESULT_DIR,
        f"{filename}_plip"
    )

    os.makedirs(plip_out, exist_ok=True)

    subprocess.run(
        f"plip -f {complex_file} -o {plip_out} --xml --pics",
        shell=True
    )

    xml_files = glob.glob(os.path.join(plip_out, "*.xml"))

    if not xml_files:
        print("PLIP failed:", filename)
        continue

    tree = ET.parse(xml_files[0])
    root = tree.getroot()

    for itype in [
        "hydrogen_bond",
        "hydrophobic_interaction",
        "pi_stack",
        "salt_bridge"
    ]:

        for inter in root.findall(f".//{itype}"):

            res_type = inter.findtext("restype")
            res_num = inter.findtext("resnr")
            lig_atom = inter.findtext("ligatom")
            prot_atom = inter.findtext("protatom")
            dist = inter.findtext("distance")

            atom_interactions.append([
                protein,
                ligand,
                pose_number,
                itype,
                res_type,
                res_num,
                lig_atom,
                prot_atom,
                dist
            ])

            residue_id = f"{protein}_{res_type}_{res_num}_{pose_number}"
            interaction_matrix[residue_id][ligand] += 1

print("PLIP analysis completed.")

# ===================== DATAFRAMES ===================== #

interaction_df = pd.DataFrame(
    atom_interactions,
    columns=[
        "Protein",
        "Ligand",
        "Pose",
        "Interaction_Type",
        "Residue_Type",
        "Residue_Number",
        "Ligand_Atom",
        "Protein_Atom",
        "Distance"
    ]
)

interaction_summary = (
    interaction_df.groupby(
        ["Protein","Ligand","Pose","Interaction_Type"]
    ).size().unstack(fill_value=0).reset_index()
)

best_df = energy_df.loc[
    energy_df.groupby("Complex")["BindingEnergy"].idxmin()
]

score_matrix = best_df.pivot(
    index="Protein",
    columns="Ligand",
    values="BindingEnergy"
)

heatmap_df = pd.DataFrame(
    interaction_matrix
).T.fillna(0)

# ===================== EXPORT ===================== #

print("\nSaving Excel report...")

with pd.ExcelWriter(
    os.path.join(RESULT_DIR, "TopN_PostDocking_Report.xlsx")
) as writer:

    energy_df.to_excel(writer, "All_Poses", index=False)
    top_df.to_excel(writer, "TopN_Poses", index=False)
    best_df.to_excel(writer, "Best_Per_Complex", index=False)
    interaction_df.to_excel(writer, "Atom_Interactions", index=False)
    interaction_summary.to_excel(writer, "Interaction_Summary", index=False)
    score_matrix.to_excel(writer, "Score_Matrix")
    heatmap_df.to_excel(writer, "Interaction_Matrix")

print("\n======================================")
print("PIPELINE FINISHED SUCCESSFULLY")
print("======================================")