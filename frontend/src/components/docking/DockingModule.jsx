import React, { useState, useRef, useEffect } from "react";
import { saveFile } from "../../utils/downloadHelper";
import { Upload, Play, ChevronDown, FileText, Download, CheckCircle, AlertCircle, Loader2, FlaskConical, Target } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";

const API = "http://localhost:5000/api/docking";

export default function DockingModule() {
  const { addDockingJob, dockingJobs = [] } = useWorkspace();
  const [step, setStep] = useState("setup"); // setup | logs | results
  const [mode, setMode] = useState("active"); // active | blind
  const [proteinFile, setProteinFile] = useState(null);
  const [ligandFile, setLigandFile] = useState(null);
  const [proteinList, setProteinList] = useState([]);
  const [ligandList, setLigandList] = useState([]);
  const [selectedProtein, setSelectedProtein] = useState("");
  const [selectedLigand, setSelectedLigand] = useState("");
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);
  const [prepPhase, setPrepPhase] = useState(null); // null | "protein" | "ligand" | "convert" | "dock"
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchLists = async () => {
    try {
      const [pr, lr] = await Promise.all([
        fetch(`${API}/proteins`).then((r) => r.json()),
        fetch(`${API}/ligands`).then((r) => r.json()),
      ]);
      setProteinList([...pr.pdbqt, ...pr.pdb]);
      setLigandList([...lr.pdbqt, ...lr.sdf]);
    } catch {}
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const uploadFile = async (file, type) => {
    const form = new FormData();
    form.append(type, file);
    const res = await fetch(`${API}/upload/${type}`, { method: "POST", body: form });
    const data = await res.json();
    if (data.success) {
      showToast(`✅ ${file.name} uploaded successfully`);
      fetchLists();
    } else {
      showToast(`❌ Upload failed`, "error");
    }
  };

  const streamEndpoint = (url, method = "POST", body = null) =>
    new Promise((resolve) => {
      fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : null,
      }).then((res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const pump = () =>
          reader.read().then(({ done, value }) => {
            if (done) { resolve(); return; }
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((l) => l.startsWith("data:"));
            lines.forEach((l) => {
              const msg = l.replace("data: ", "").trim();
              if (msg) setLogs((prev) => [...prev, msg]);
            });
            pump();
          });
        pump();
      });
    });

  const handleRun = async () => {
    if (!selectedProtein && !proteinFile) {
      showToast("❌ Please select or upload a protein file", "error"); return;
    }
    if (!selectedLigand && !ligandFile) {
      showToast("❌ Please select or upload a ligand file", "error"); return;
    }

    setLogs([]);
    setRunning(true);
    setStep("logs");

    try {
      setPrepPhase("protein");
      await streamEndpoint(`${API}/prepare/protein`, "POST");

      setPrepPhase("ligand");
      await streamEndpoint(`${API}/prepare/ligand`, "POST");

      setPrepPhase("convert");
      await streamEndpoint(`${API}/convert`, "POST");

      setPrepPhase("dock");
      await streamEndpoint(`${API}/run`, "POST", { mode });

      setPrepPhase(null);
      setRunning(false);
      showToast("✅ Docking simulation completed successfully!");

      // Fetch results
      const res = await fetch(`${API}/results`);
      const data = await res.json();
      setResults(data);
      setStep("results");
    } catch (err) {
      setRunning(false);
      setPrepPhase(null);
      showToast("❌ Something went wrong", "error");
    }
  };

  const phaseLabel = {
    protein: "Preparing protein...",
    ligand: "Preparing ligand...",
    convert: "Converting to PDBQT...",
    dock: "Running docking simulation...",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-body)", fontFamily: "Inter, sans-serif", padding: "24px" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? "#dc2626" : "#14b8a6",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 8
        }}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-heading)", margin: 0 }}>Molecular Docking</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>AutoDock Vina · Protein–Ligand Docking Simulation</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["setup", "Setup"], ["logs", "Live Logs"], ["results", "Results"]].map(([key, label]) => (
          <button key={key} onClick={() => setStep(key)} style={{
            padding: "7px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
            background: step === key ? "var(--primary-blue)" : "var(--border2)",
            color: step === key ? "#fff" : "var(--text-muted)",
            transition: "all 0.2s"
          }}>{label}</button>
        ))}
      </div>

      {/* SETUP PANEL */}
      {step === "setup" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>

          {/* Protein */}
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: 20, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "var(--border2)", borderRadius: 8, padding: 7 }}>
                <Target size={16} color="var(--primary-blue)" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-heading)" }}>Protein (Receptor)</span>
            </div>

            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Select prepared PDBQT</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <select value={selectedProtein} onChange={(e) => setSelectedProtein(e.target.value)} style={{
                width: "100%", background: "var(--border2)", border: "1px solid var(--border)", borderRadius: 8,
                color: "var(--text-body)", padding: "9px 32px 9px 12px", fontSize: 13, appearance: "none", cursor: "pointer"
              }}>
                <option value="">-- Select protein --</option>
                {proteinList.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>

            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Or upload new PDB file</label>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
              background: "var(--border2)", border: "1px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13
            }}>
              <Upload size={14} color="var(--primary-blue)" />
              <span style={{ color: proteinFile ? "var(--primary-blue)" : "var(--text-muted)" }}>
                {proteinFile ? proteinFile.name : "Choose .pdb file"}
              </span>
              <input type="file" accept=".pdb" style={{ display: "none" }} onChange={(e) => {
                const f = e.target.files[0];
                if (f) { setProteinFile(f); uploadFile(f, "protein"); }
              }} />
            </label>
          </div>

          {/* Ligand */}
          <div style={{ background: "var(--surface)", borderRadius: 12, padding: 20, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "var(--border2)", borderRadius: 8, padding: 7 }}>
                <FlaskConical size={16} color="var(--success)" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-heading)" }}>Ligand (Compound)</span>
            </div>

            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Select prepared PDBQT/SDF</label>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <select value={selectedLigand} onChange={(e) => setSelectedLigand(e.target.value)} style={{
                width: "100%", background: "var(--border2)", border: "1px solid var(--border)", borderRadius: 8,
                color: "var(--text-body)", padding: "9px 32px 9px 12px", fontSize: 13, appearance: "none", cursor: "pointer"
              }}>
                <option value="">-- Select ligand --</option>
                {ligandList.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>

            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Or upload new SDF file</label>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
              background: "var(--border2)", border: "1px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13
            }}>
              <Upload size={14} color="var(--success)" />
              <span style={{ color: ligandFile ? "var(--success)" : "var(--text-muted)" }}>
                {ligandFile ? ligandFile.name : "Choose .sdf file"}
              </span>
              <input type="file" accept=".sdf" style={{ display: "none" }} onChange={(e) => {
                const f = e.target.files[0];
                if (f) { setLigandFile(f); uploadFile(f, "ligand"); }
              }} />
            </label>
          </div>

          {/* Docking Mode */}
          <div style={{ gridColumn: "1 / -1", background: "var(--surface)", borderRadius: 12, padding: 20, border: "1px solid var(--border)" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", display: "block", marginBottom: 14 }}>Docking Mode</label>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[["active", "Active Site Docking", "Uses fpocket to detect binding pocket"], ["blind", "Blind Docking", "Searches entire protein surface"]].map(([val, label, desc]) => (
                <div key={val} onClick={() => setMode(val)} style={{
                  flex: 1, padding: 14, borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${mode === val ? "var(--primary-blue)" : "var(--border)"}`,
                  background: mode === val ? "var(--border2)" : "var(--surface)",
                  transition: "all 0.2s"
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: mode === val ? "var(--primary-blue)" : "var(--text-muted)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
                </div>
              ))}
            </div>

            <button onClick={handleRun} disabled={running} style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none", cursor: running ? "not-allowed" : "pointer",
              background: running ? "var(--border2)" : "linear-gradient(135deg, var(--primary-blue), var(--success))",
              color: running ? "var(--text-muted)" : "#fff", fontWeight: 700, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all 0.2s"
            }}>
              {running ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={18} />}
              {running ? (phaseLabel[prepPhase] || "Processing...") : "Start Docking Simulation"}
            </button>
          </div>
        </div>
      )}

      {/* LOGS PANEL */}
      {step === "logs" && (
        <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", padding: 20, maxWidth: 900 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            {running && <Loader2 size={16} color="var(--primary-blue)" style={{ animation: "spin 1s linear infinite" }} />}
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--primary-blue)" }}>
              {running ? phaseLabel[prepPhase] || "Running..." : "Simulation Complete"}
            </span>
          </div>
          <div style={{ background: "var(--bg)", borderRadius: 8, padding: 16, height: 420, overflowY: "auto", fontFamily: "monospace", fontSize: 12, lineHeight: 1.8 }}>
            {logs.length === 0 && <div style={{ color: "var(--text-muted)" }}>Waiting for output...</div>}
            {logs.map((l, i) => (
              <div key={i} style={{
                color: l.startsWith("✅") ? "var(--success)" : l.startsWith("❌") ? "var(--danger)" : l.startsWith("⚠️") ? "var(--warning)" : l.startsWith("🚀") || l.startsWith("🔬") || l.startsWith("💊") || l.startsWith("🔄") ? "var(--primary-blue)" : "var(--text-muted)"
              }}>{l}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* RESULTS PANEL */}
      {step === "results" && (
        <div style={{ maxWidth: 900 }}>
          {results.length === 0 ? (
            <div style={{ background: "var(--surface)", borderRadius: 12, padding: 40, textAlign: "center", border: "1px solid var(--border)" }}>
              <FileText size={40} color="var(--border)" style={{ margin: "0 auto 12px" }} />
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>No results yet. Run a docking simulation first.</div>
            </div>
          ) : results.map((r) => (
            <div key={r.name} style={{ background: "var(--surface)", borderRadius: 12, padding: 20, marginBottom: 16, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--primary-blue)" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{r.modes.length} binding poses found</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    onClick={() => {
                      addDockingJob({ name: r.name, outFile: r.outFile, modes: r.modes });
                      showToast("Added docking job to workspace project!");
                    }} 
                    disabled={(dockingJobs || []).some(j => j.name === r.name)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                      background: (dockingJobs || []).some(j => j.name === r.name) ? "var(--border2)" : "var(--primary-blue)", 
                      border: "1px solid " + ((dockingJobs || []).some(j => j.name === r.name) ? "var(--border)" : "var(--primary-blue)"), 
                      borderRadius: 8,
                      color: (dockingJobs || []).some(j => j.name === r.name) ? "var(--text-muted)" : "#fff", 
                      fontSize: 13, cursor: (dockingJobs || []).some(j => j.name === r.name) ? "not-allowed" : "pointer", 
                      fontWeight: 500
                    }}
                  >
                    {(dockingJobs || []).some(j => j.name === r.name) ? "✓ Added" : "Add to Project"}
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API}/download/${r.outFile}`);
                        if (!response.ok) throw new Error("Fetch failed");
                        const text = await response.text();
                        await saveFile(text, r.outFile, 'PDBQT Files', { 'text/plain': ['.pdbqt'] });
                      } catch (err) {
                        window.open(`${API}/download/${r.outFile}`, '_blank');
                      }
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                      background: "var(--border2)", border: "1px solid var(--border)", borderRadius: 8,
                      color: "var(--primary-blue)", fontSize: 13, cursor: "pointer", fontWeight: 500
                    }}
                  >
                    <Download size={14} /> Download PDBQT
                  </button>
                </div>
              </div>

              {r.modes.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Mode", "Binding Affinity (kcal/mol)", "RMSD l.b.", "RMSD u.b."].map((h) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.modes.map((m, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i === 0 ? "var(--border2)" : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: "var(--text-body)" }}>
                          {i === 0 && <span style={{ background: "var(--primary-blue)", color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 11, marginRight: 6 }}>Best</span>}
                          {m.mode}
                        </td>
                        <td style={{ padding: "8px 12px", color: i === 0 ? "var(--success)" : "var(--text-body)", fontWeight: i === 0 ? 700 : 400 }}>{m.affinity}</td>
                        <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.rmsdLB ?? "—"}</td>
                        <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{m.rmsdUB ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}