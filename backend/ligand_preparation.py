import os
os.environ["PATH"] += r";C:\Program Files\OpenBabel-3.1.1"
import glob
import subprocess

LIGAND_DIR = "ligands"
RESULT_DIR = "results"
PH = 7.4

os.makedirs(LIGAND_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

all_sdfs = glob.glob(os.path.join(LIGAND_DIR, "*.sdf"))

original_ligands = [
    f for f in all_sdfs
    if "_fixed" not in os.path.basename(f)
    and "test" not in os.path.basename(f)
]

failed_ligands = []
skipped_ligands = []

for sdf in original_ligands:
    lig_name = os.path.basename(sdf).replace(".sdf", "")
    print(f"\nProcessing Ligand: {lig_name}")

    ligand_pdbqt = os.path.join(RESULT_DIR, lig_name + ".pdbqt")
    fixed_sdf = os.path.join(LIGAND_DIR, lig_name + "_fixed.sdf")

    # ✅ FIX LIGAND WITH ROBUST FALLBACKS
    if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
        print(f"[INFO] Preparing ligand: {lig_name}")

        # Attempt 1: High-quality 3D generation with MMFF94
        fix_cmd_1 = f'obabel -isdf "{sdf}" -osdf -O "{fixed_sdf}" -h --gen3d --minimize --ff MMFF94 --steps 2500'
        subprocess.run(fix_cmd_1, shell=True, stderr=subprocess.DEVNULL)

        # Attempt 2: Fallback to UFF Force Field
        if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
            print(f"  [WARNING] MMFF94 failed for {lig_name}. Trying UFF...")
            fix_cmd_2 = f'obabel -isdf "{sdf}" -osdf -O "{fixed_sdf}" -h --gen3d --minimize --ff UFF --steps 2500'
            subprocess.run(fix_cmd_2, shell=True, stderr=subprocess.DEVNULL)

        # Attempt 3: Fallback to basic 3D generation
        if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
            print(f"  [WARNING] UFF failed for {lig_name}. Falling back to basic 3D generation...")
            fix_cmd_3 = f'obabel -isdf "{sdf}" -osdf -O "{fixed_sdf}" -r --gen3d'
            subprocess.run(fix_cmd_3, shell=True, stderr=subprocess.DEVNULL)

        # Final check to ensure we actually got a valid file
        if not os.path.exists(fixed_sdf) or os.path.getsize(fixed_sdf) < 200:
            print(f"[ERROR] All 3D generation attempts failed for: {lig_name}")
            failed_ligands.append(lig_name)
            continue
    else:
        print(f"[INFO] Using existing fixed ligand: {lig_name}")

    # Ligand preparation only
    print(f"[SUCCESS] Prepared ligand: {lig_name}_fixed.sdf")

print("\n======================================")
print("LIGAND PREPARATION FINISHED")
print(f"Failed: {len(failed_ligands)}, Skipped: {len(skipped_ligands)}")
print("======================================")
