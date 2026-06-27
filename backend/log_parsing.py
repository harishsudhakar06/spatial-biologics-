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