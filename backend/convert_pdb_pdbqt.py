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

