import React, { useState, useRef, useEffect } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";

const ALL_COLS = [
  "Caco-2 (logPaap)", "Human Oral Bioavailability 20%", "Human Intestinal Absorption",
  "Madin-Darby Canine Kidney", "Human Oral Bioavailability 50%", "P-Glycoprotein Inhibitor",
  "P-Glycoprotein Substrate", "Skin Permeability", "Blood-Brain Barrier CNS",
  "Blood-Brain Barrier", "Fraction Unbound (Human)", "Plasma Protein Binding",
  "Steady State Volume of Distribution", "Breast Cancer Resistance Protein",
  "CYP 1A2 Inhibitor", "CYP 1A2 Substrate", "CYP 2C19 Inhibitor", "CYP 2C19 Substrate",
  "CYP 2C9 Inhibitor", "CYP 2C9 Substrate", "CYP 2D6 Inhibitor", "CYP 2D6 Substrate",
  "CYP 3A4 Inhibitor", "CYP 3A4 Substrate", "OATP1B1", "OATP1B3", "Clearance",
  "Organic Cation Transporter 2", "Half-Life of Drug", "AMES Mutagenesis", "Avian", "Bee",
  "Bioconcentration Factor", "Biodegradation", "Carcinogenesis", "Crustacean",
  "Liver Injury I (DILI)", "Eye Corrosion", "Eye Irritation", "Maximum Tolerated Dose",
  "Liver Injury II", "hERG Blockers", "Daphnia Magna", "Micronucleus",
  "NR-AhR", "NR-AR", "NR-AR-LBD", "NR-Aromatase", "NR-ER", "NR-ER-LBD",
  "NR-GR", "NR-PPAR-gamma", "NR-TR", "T. Pyriformis", "Rat (Acute)", "Rat (Chronic Oral)",
  "Fathead Minnow", "Respiratory Disease", "Skin Sensitisation",
  "SR-ARE", "SR-ATAD5", "SR-HSE", "SR-MMP", "SR-p53",
  "Boiling Point", "Hydration Free Energy", "Log(D) at pH=7.4", "Log(P)", "Log(S)",
  "Log(Vapor Pressure)", "Melting Point", "pKa Acid", "pKa Basic",
];

const CATEGORIES = {
  Absorption: [
    "Caco-2 (logPaap)", "Human Oral Bioavailability 20%", "Human Intestinal Absorption",
    "Madin-Darby Canine Kidney", "Human Oral Bioavailability 50%",
    "P-Glycoprotein Inhibitor", "P-Glycoprotein Substrate", "Skin Permeability",
  ],
  Distribution: [
    "Blood-Brain Barrier CNS", "Blood-Brain Barrier", "Fraction Unbound (Human)",
    "Plasma Protein Binding", "Steady State Volume of Distribution",
  ],
  Metabolism: [
    "Breast Cancer Resistance Protein", "CYP 1A2 Inhibitor", "CYP 1A2 Substrate",
    "CYP 2C19 Inhibitor", "CYP 2C19 Substrate", "CYP 2C9 Inhibitor", "CYP 2C9 Substrate",
    "CYP 2D6 Inhibitor", "CYP 2D6 Substrate", "CYP 3A4 Inhibitor", "CYP 3A4 Substrate",
    "OATP1B1", "OATP1B3",
  ],
  Excretion: ["Clearance", "Organic Cation Transporter 2", "Half-Life of Drug"],
  Toxicity: [
    "AMES Mutagenesis", "Avian", "Bee", "Bioconcentration Factor", "Biodegradation",
    "Carcinogenesis", "Crustacean", "Liver Injury I (DILI)", "Eye Corrosion", "Eye Irritation",
    "Maximum Tolerated Dose", "Liver Injury II", "hERG Blockers", "Daphnia Magna", "Micronucleus",
    "NR-AhR", "NR-AR", "NR-AR-LBD", "NR-Aromatase", "NR-ER", "NR-ER-LBD",
    "NR-GR", "NR-PPAR-gamma", "NR-TR", "T. Pyriformis", "Rat (Acute)", "Rat (Chronic Oral)",
    "Fathead Minnow", "Respiratory Disease", "Skin Sensitisation",
    "SR-ARE", "SR-ATAD5", "SR-HSE", "SR-MMP", "SR-p53",
  ],
  "General Properties": [
    "Boiling Point", "Hydration Free Energy", "Log(D) at pH=7.4", "Log(P)",
    "Log(S)", "Log(Vapor Pressure)", "Melting Point", "pKa Acid", "pKa Basic",
  ],
};

const CAT_COLORS = {
  Absorption: "#005eff",
  Distribution: "#4ed5fe",
  Metabolism: "#43ddac",
  Excretion: "#feb200",
  Toxicity: "#ed0d0d",
  "General Properties": "#6c757d",
};

const LOADING_MESSAGES = [
  "🔬 Initialising molecular analysis...",
  "⚗️ Parsing SMILES structure...",
  "🧬 Computing absorption properties...",
  "🩸 Predicting blood-brain barrier permeability...",
  "💊 Estimating oral bioavailability...",
  "🧪 Analysing CYP enzyme interactions...",
  "⚡ Calculating plasma protein binding...",
  "🦠 Running toxicity screening...",
  "🐀 Evaluating rat acute toxicity...",
  "❤️ Checking hERG cardiotoxicity...",
  "🌿 Assessing environmental impact...",
  "📊 Compiling ADMET profile...",
  "🔄 Almost there — finalising results...",
];

function buildCSV(results) {
  const headers = ["SMILES", "Repaired SMILES", "Status", ...ALL_COLS];
  const rows = results.map(r =>
    headers.map(h => {
      let v = "-";
      if (h === "SMILES") v = r.originalSmiles || "";
      else if (h === "Repaired SMILES") v = r.repairedSmiles || r.originalSmiles || "";
      else if (h === "Status") v = r.error ? "Error: " + r.error : "Success";
      else v = r.result?.[h] ?? "-";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")
  );
  return headers.join(",") + "\n" + rows.join("\n");
}

function buildCopyText(results) {
  const headers = ["SMILES", "Repaired SMILES", "Status", ...ALL_COLS];
  const rows = results.map(r =>
    headers.map(h => {
      if (h === "SMILES") return r.originalSmiles || "";
      if (h === "Repaired SMILES") return r.repairedSmiles || r.originalSmiles || "";
      if (h === "Status") return r.error ? "Error: " + r.error : "Success";
      return r.result?.[h] ?? "-";
    }).join("\t")
  );
  return headers.join("\t") + "\n" + rows.join("\n");
}

function getColor(val) {
  if (typeof val !== "string") return "#333";
  const v = val.toLowerCase();
  if (
    v.includes("toxic") || v.includes(" inhibitor") || v.includes("unsafe") ||
    v.includes("carcinogen") || v.includes("non-bioavailable") || v.includes("non-permeable") ||
    v.includes("non-penetrating") || v.includes("non-absorbed")
  ) return "#c0392b";
  if (
    v.includes("safe") || v.includes("non-inhibitor") || v.includes("non-substrate") ||
    v.includes("absorbed") || v.includes("bioavailable") || v.includes("permeable") ||
    v.includes("penetrable") || v.includes("non-carcinogen") || v.includes("non-toxic")
  ) return "#27ae60";
  return "#333";
}

async function runSingleSmiles(smilesStr) {
  let repairedSmiles = smilesStr;
  let repairNote = null;
  try {
    const repRes = await fetch("/api/deeppk/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles: smilesStr }),
    });
    const repData = await repRes.json();
    const r = repData.results?.[0];
    if (r && r.repaired && r.repaired !== smilesStr) {
      repairedSmiles = r.repaired;
      repairNote = r.note;
    }
  } catch (_) {}

  const subRes = await fetch("/api/deeppk/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles: repairedSmiles, pred_type: "admet" }),
  });
  const subData = await subRes.json();
  if (!subRes.ok || !subData.job_id) throw new Error(subData.error || "Submission failed");

  const jobId = subData.job_id;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`/api/deeppk/results?job_id=${jobId}`);
    const pollData = await pollRes.json();
    if (pollData.status === "error") throw new Error(pollData.message || "Prediction error");
    if (pollData.status === "done" && pollData.result)
      return { result: pollData.result, repairedSmiles, repairNote };
  }
  throw new Error("Timed out");
}

/* ═══════════════════════════════════════════════════════════
   LOADING ANIMATION OVERLAY
═══════════════════════════════════════════════════════════ */
function LoadingOverlay({ current, done, total }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <style>{`
        @keyframes lOrbit {
          from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
        }
        @keyframes lOrbit2 {
          from { transform: rotate(180deg) translateX(28px) rotate(-180deg); }
          to   { transform: rotate(540deg) translateX(28px) rotate(-540deg); }
        }
        @keyframes lOrbit3 {
          from { transform: rotate(90deg) translateX(40px) rotate(-90deg); }
          to   { transform: rotate(450deg) translateX(40px) rotate(-450deg); }
        }
        @keyframes lBarShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes lBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-10px); }
        }
        @keyframes lGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(108,63,197,0.4); }
          50%      { box-shadow: 0 0 24px rgba(108,63,197,0.9); }
        }
        @keyframes lFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      <div style={{
        margin: "20px 0",
        background: "linear-gradient(135deg,#f8f6ff,#f0ebff)",
        border: "1.5px solid #d0c4f0",
        borderRadius: 16,
        padding: "32px 28px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background shimmer stripe */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg,transparent 40%,rgba(108,63,197,0.06) 50%,transparent 60%)",
          backgroundSize: "200% 100%",
          animation: "lBarShimmer 2.4s linear infinite",
          pointerEvents: "none",
        }} />

        {/* Orbiting molecule */}
        <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 24px" }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 26, height: 26, marginTop: -13, marginLeft: -13,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#6c3fc5,#2563eb)",
            animation: "lGlow 1.8s ease-in-out infinite",
            zIndex: 2,
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 70, height: 70, marginTop: -35, marginLeft: -35,
            borderRadius: "50%", border: "1.5px dashed rgba(108,63,197,0.3)",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 90, height: 90, marginTop: -45, marginLeft: -45,
            borderRadius: "50%", border: "1.5px dashed rgba(37,99,235,0.2)",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 10, height: 10, marginTop: -5, marginLeft: -5,
            borderRadius: "50%", background: "#6c3fc5",
            animation: "lOrbit 1.6s linear infinite", zIndex: 3,
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 8, height: 8, marginTop: -4, marginLeft: -4,
            borderRadius: "50%", background: "#2563eb",
            animation: "lOrbit2 1.6s linear infinite", zIndex: 3,
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 7, height: 7, marginTop: -3.5, marginLeft: -3.5,
            borderRadius: "50%", background: "#38bdf8",
            animation: "lOrbit3 2.4s linear infinite", zIndex: 3,
          }} />
        </div>

        {/* Rotating message */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: "#5b21b6",
          minHeight: 22, marginBottom: 20,
          animation: fade ? "lFadeIn 0.4s ease" : "lFadeOut 0.3s ease",
        }}>
          {LOADING_MESSAGES[msgIdx]}
        </div>

        {/* Current SMILES */}
        {current && (
          <div style={{
            fontSize: 11, color: "#7c3aed", fontFamily: "monospace",
            background: "#ede9fe", borderRadius: 6, padding: "4px 12px",
            display: "inline-block", marginBottom: 20, maxWidth: "100%",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {current.length > 60 ? current.slice(0, 60) + "…" : current}
          </div>
        )}

        {/* Progress bar */}
        <div style={{
          background: "#e8e0fc", borderRadius: 99,
          height: 10, overflow: "hidden", marginBottom: 10,
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: "linear-gradient(90deg,#6c3fc5,#2563eb,#38bdf8)",
            backgroundSize: "200% 100%",
            animation: "lBarShimmer 1.8s linear infinite",
            transition: "width 0.5s ease",
          }} />
        </div>

        <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, marginBottom: 16 }}>
          {total > 1
            ? `Processing ${done + 1} of ${total} SMILES — ${pct}% complete`
            : "Analysing your compound…"}
        </div>

        {/* Bouncing dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i % 2 === 0 ? "#6c3fc5" : "#2563eb",
              animation: `lBounce 1.3s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SMILES REPAIR PANEL
═══════════════════════════════════════════════════════════ */
function RepairPanel({ onUseRepaired, initialSmiles, onInitialSmilesConsumed }) {
  const [input, setInput] = useState(initialSmiles || "");
  const [repairResults, setRepairResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    if (initialSmiles) {
      setInput(initialSmiles);
      onInitialSmilesConsumed?.();
    }
  }, [initialSmiles]);

  const handleRepair = async () => {
    const lines = input.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 2);
    if (!lines.length) return;
    setLoading(true);
    setRepairResults([]);
    try {
      const res = await fetch("/api/deeppk/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smiles: input }),
      });
      const data = await res.json();
      setRepairResults(data.results || []);
    } catch (e) {
      setRepairResults([{ original: input, repaired: input, changed: false, note: "Server error: " + e.message, steps: [] }]);
    }
    setLoading(false);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const handleCopyAll = () => {
    const text = repairResults.map(r => r.repaired).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx("all");
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  return (
    <div style={S.repairPanel}>
      <div style={S.repairHeader}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#b45309" }}>🔧 SMILES Repair Tool</span>
        <span style={S.repairBadge}>Fixes dots · @ stereo · Metal ions · Counterions · Bracket atoms</span>
      </div>
      <p style={S.repairDesc}>
        Paste broken or complex SMILES below (e.g. <code style={S.inlineCode}>CC(=O)O.[Mg2+]</code>,&nbsp;
        <code style={S.inlineCode}>C[C@@H](N)C(=O)O</code>, salts with dots). The tool will clean them
        automatically so they work with the ADMET predictor.
      </p>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            "Paste incorrect / complex SMILES here (one per line):\n" +
            "CC(=O)O.[Mg2+]\n" +
            "C[C@@H](N)C(=O)O.[Na+].[Cl-]\n" +
            "[Zn2+].CC(=O)[O-]\n" +
            "O=C(O)c1ccc(N)cc1.HCl"
          }
          style={{ ...S.textarea, minHeight: 120, borderColor: "#f0c040" }}
          rows={5}
        />
        <div style={S.charCount}>
          {input.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 2).length} SMILES detected
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          onClick={handleRepair}
          disabled={loading || !input.trim()}
          style={{ ...S.btn, background: "#d97706", minWidth: 130 }}
        >
          {loading ? "⏳ Repairing..." : "🔧 Repair SMILES"}
        </button>
        {repairResults.length > 0 && (
          <>
            <button onClick={handleCopyAll} style={{ ...S.outlineBtn, borderColor: "#d97706", color: "#d97706" }}>
              {copiedIdx === "all" ? "✅ Copied All!" : "📋 Copy All Repaired"}
            </button>
            {onUseRepaired && (
              <button
                onClick={() => onUseRepaired(repairResults.map(r => r.repaired).join("\n"))}
                style={{ ...S.btn, background: "#6c3fc5" }}
              >
                ➡ Use in ADMET
              </button>
            )}
          </>
        )}
      </div>

      {repairResults.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {repairResults.map((r, i) => (
            <div key={i} style={{ ...S.repairRow, borderLeft: `4px solid ${r.changed ? "#d97706" : "#27ae60"}` }}>
              <div style={S.repairField}>
                <span style={S.repairFieldLabel}>Original:</span>
                <code style={{ ...S.smilesCode, color: r.changed ? "#c0392b" : "#333" }}>{r.original}</code>
              </div>
              <div style={S.repairField}>
                <span style={{ ...S.repairFieldLabel, color: "#d97706" }}>Repaired:</span>
                <code style={{ ...S.smilesCode, color: r.changed ? "#27ae60" : "#333", fontWeight: 700 }}>{r.repaired}</code>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {r.changed
                  ? <span style={S.changeTag}>✅ Fixed: {r.note}</span>
                  : <span style={S.noChangeTag}>✔ No changes needed</span>
                }
                <button onClick={() => handleCopy(r.repaired, i)} style={S.miniBtn}>
                  {copiedIdx === i ? "✅ Copied!" : "📋 Copy"}
                </button>
                {onUseRepaired && (
                  <button
                    onClick={() => onUseRepaired(r.repaired)}
                    style={{ ...S.miniBtn, background: "#6c3fc5", color: "#fff", borderColor: "#6c3fc5" }}
                  >
                    ➡ Use in ADMET
                  </button>
                )}
              </div>
              {r.steps && r.steps.length > 0 && (
                <ul style={S.stepsList}>
                  {r.steps.map((step, j) => (
                    <li key={j} style={{ color: "#92400e", fontSize: 11 }}>• {step}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN MODULE
═══════════════════════════════════════════════════════════ */
export default function DeepPKModule() {
  const { admetSmiles, setAdmetSmiles } = useWorkspace();

  const [inputMode, setInputMode] = useState("text");
  const [smilesText, setSmilesText] = useState("");
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [allResults, setAllResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  const [incomingRepairSmiles, setIncomingRepairSmiles] = useState("");
  const fileRef = useRef();
  const folderRef = useRef();
  const excelRef = useRef();
  const abortRef = useRef(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // ── Receive SMILES from Ligand "Add to ADMET" button ──────────
  useEffect(() => {
    if (!admetSmiles) return;
    const { smiles, needsRepair } = admetSmiles;
    if (needsRepair) {
      setShowRepair(true);
      setIncomingRepairSmiles(smiles);
    } else {
      setSmilesText(prev => {
        const existing = prev.trim();
        return existing ? existing + "\n" + smiles : smiles;
      });
    }
    setAdmetSmiles(null);
  }, [admetSmiles]);
  // ─────────────────────────────────────────────────────────────

  const parseSmilesList = (text) =>
    text.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 3);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (["txt", "csv", "smi", "smiles", "tsv"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => { setSmilesText(ev.target.result); setInputMode("text"); };
      reader.readAsText(file);
    } else if (["sdf", "mol", "mol2", "molto", "pdb"].includes(ext)) {
      await processBulkFiles([file]);
    } else {
      setError("Unsupported file format.");
    }
  };

  const handleFolderUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Count only readable files (including structure files)
    const validFiles = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ["txt", "csv", "smi", "smiles", "tsv", "sdf", "mol", "mol2", "molto", "pdb"].includes(ext);
    });

    if (validFiles.length === 0) {
      setError("No readable molecular structure or text files found in the folder.");
      return;
    }

    setFileName(`${validFiles.length} files (Folder)`);
    await processBulkFiles(validFiles);
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    await processBulkFiles([file]);
  };

  const processBulkFiles = async (filesList) => {
    setUploadingBulk(true);
    setError(null);
    try {
      const formData = new FormData();
      for (const file of filesList) {
        formData.append("files", file);
      }

      const res = await fetch("/api/deeppk/upload-bulk", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse files");
      }

      if (data.results && data.results.length > 0) {
        const smilesList = data.results.map(r => r.repaired);
        const smilesContent = smilesList.join("\n");
        setSmilesText(smilesContent);
        setInputMode("text");
      } else {
        throw new Error("No SMILES strings found in the uploaded files.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while uploading and parsing the files.");
    } finally {
      setUploadingBulk(false);
    }
  };

  const handleRun = async () => {
    const list = parseSmilesList(smilesText);
    if (!list.length) { setError("Please enter at least one valid SMILES string."); return; }
    await runAnalysisWithList(list);
  };

  const runAnalysisWithList = async (list) => {
    setError(null);
    setAllResults([]);
    setRunning(true);
    abortRef.current = false;
    setProgress({ done: 0, total: list.length, current: "Standardizing & repairing SMILES..." });

    let repairResultsMap = {}; // original -> { repaired, note }
    let repairedList = [];
    try {
      const repRes = await fetch("/api/deeppk/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smiles: list.join("\n") }),
      });
      const repData = await repRes.json();
      if (repData.results) {
        repData.results.forEach(r => {
          repairResultsMap[r.original] = { repaired: r.repaired, note: r.note };
          if (r.repaired && r.repaired.length > 2) {
            repairedList.push(r.repaired);
          }
        });
      }
    } catch (e) {
      console.error("Repair error:", e);
    }

    const uniqueRepaired = [...new Set(repairedList)];
    if (uniqueRepaired.length === 0) {
      setError("No valid SMILES strings to evaluate.");
      setRunning(false);
      return;
    }

    setProgress({ done: 0, total: list.length, current: `Submitting batch job to server...` });
    let jobId = null;
    try {
      const subRes = await fetch("/api/deeppk/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smiles: uniqueRepaired.join("\n"), pred_type: "admet" }),
      });
      const subData = await subRes.json();
      if (!subRes.ok || !subData.job_id) {
        throw new Error(subData.error || "Submission failed");
      }
      jobId = subData.job_id;
    } catch (err) {
      setError(err.message || "Failed to submit batch job.");
      setRunning(false);
      return;
    }

    let jobResults = null;
    let attempts = 0;
    const maxAttempts = 100;
    while (attempts < maxAttempts) {
      if (abortRef.current) break;
      const elapsedSec = attempts * 3;
      const simulatedDone = Math.min(attempts * Math.ceil(list.length / 15), list.length - 1);
      let statusMsg;
      if (elapsedSec < 300) {
        statusMsg = `Analyzing on DeepPK server... (elapsed: ${elapsedSec}s)`;
      } else {
        statusMsg = `DeepPK server queue is currently busy. Your job is queued — results will appear when ready. You can leave this tab open and wait, or stop and try again later when queue is shorter.`;
      }
      setProgress({
        done: simulatedDone,
        total: list.length,
        current: statusMsg
      });
      
      await new Promise(r => setTimeout(r, 3000));
      attempts++;

      try {
        const pollRes = await fetch(`/api/deeppk/results?job_id=${jobId}`);
        const pollData = await pollRes.json();
        if (pollData.status === "error") {
          throw new Error(pollData.message || "Prediction error");
        }
        if (pollData.status === "not_found") {
          throw new Error("Prediction job not found — the server may have restarted. Please try submitting again.");
        }
        if (pollData.status === "done" && pollData.results) {
          jobResults = pollData.results;
          break;
        }
      } catch (err) {
        setError(err.message || "Error polling results.");
        setRunning(false);
        return;
      }
    }

    if (abortRef.current) {
      setRunning(false);
      return;
    }

    if (!jobResults) {
      setError("DeepPK server queue is busy. Your job is still processing — try checking back in a few minutes, or submit again later.");
      setRunning(false);
      return;
    }

    const resultMap = {};
    jobResults.forEach(r => {
      resultMap[r.SMILES] = r;
    });

    const finalResults = list.map(originalSmi => {
      const repairInfo = repairResultsMap[originalSmi] || { repaired: originalSmi, note: null };
      const result = resultMap[repairInfo.repaired] || null;
      return {
        originalSmiles: originalSmi,
        repairedSmiles: repairInfo.repaired,
        repairNote: repairInfo.note,
        result: result,
        error: result ? null : "No prediction results returned for this compound"
      };
    });

    setAllResults(finalResults);
    setActiveIdx(0);
    setProgress({ done: list.length, total: list.length, current: "Analysis complete!" });
    setRunning(false);
  };

  const handleStop = () => { abortRef.current = true; };

  const handleSaveCSV = async () => {
    if (!allResults.length) return;
    const csv = buildCSV(allResults);
    
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `admet_batch_${Date.now()}.csv`,
          types: [{
            description: "CSV Files",
            accept: {
              "text/csv": [".csv"]
            }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(csv);
        await writable.close();
      } catch (err) {
        if (err.name !== "AbortError") {
          fallbackDownload(csv);
        }
      }
    } else {
      fallbackDownload(csv);
    }
  };

  const fallbackDownload = (csv) => {
    const suggested = `admet_batch_${Date.now()}.csv`;
    const name = window.prompt("Save CSV as:", suggested);
    if (!name) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name.endsWith(".csv") ? name : name + ".csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    if (!allResults.length) return;
    navigator.clipboard.writeText(buildCopyText(allResults)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleUseRepaired = (repairedText) => {
    setSmilesText(prev => {
      const existing = prev.trim();
      return existing ? existing + "\n" + repairedText : repairedText;
    });
    setShowRepair(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeResult = allResults[activeIdx] || null;

  return (
    <div style={S.wrap}>
      <h2 style={S.title}>ADMET Prediction</h2>
      <p style={S.sub}>Pharmacokinetic &amp; Toxicity Analysis — 73 endpoints · Multi-SMILES supported</p>

      {/* ── Input mode tabs ── */}
      <div style={S.tabRow}>
        <button onClick={() => setInputMode("text")} style={{ ...S.tab, ...(inputMode === "text" ? S.tabActive : {}) }}>
          ✏️ Enter SMILES
        </button>
        
        <button onClick={() => { setInputMode("file"); fileRef.current?.click(); }} style={{ ...S.tab, ...(inputMode === "file" ? S.tabActive : {}) }}>
          📄 Upload File
        </button>
        <input ref={fileRef} type="file" accept=".txt,.csv,.smi,.smiles,.sdf,.mol,.mol2,.molto,.pdb" style={{ display: "none" }} onChange={handleFileUpload} />

        <button onClick={() => { setInputMode("folder"); folderRef.current?.click(); }} style={{ ...S.tab, ...(inputMode === "folder" ? S.tabActive : {}) }}>
          📂 Upload Folder
        </button>
        <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple style={{ display: "none" }} onChange={handleFolderUpload} />

        <button onClick={() => { setInputMode("excel"); excelRef.current?.click(); }} style={{ ...S.tab, ...(inputMode === "excel" ? S.tabActive : {}) }}>
          📊 Upload Excel
        </button>
        <input ref={excelRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleExcelUpload} />

        {fileName && <span style={S.fileTag}>📄 {fileName}</span>}
      </div>

      {uploadingBulk && (
        <div style={{ ...S.fileTag, background: "#fffdf0", borderColor: "#f0c040", color: "#b45309", margin: "10px 0", display: "inline-block" }}>
          ⏳ Uploading and standardizing SMILES from bulk files...
        </div>
      )}

      {/* ── SMILES textarea ── */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <textarea
          className="admet-textarea"
          value={smilesText}
          onChange={e => setSmilesText(e.target.value)}
          placeholder={"Enter one or multiple SMILES (one per line, or comma-separated):\nCC(=O)Oc1ccccc1C(=O)O\nCN1CCC[C@H]1c2cccnc2\nc1ccc2c(c1)cc1ccc3cccc4ccc2c1c34"}
          style={S.textarea}
          disabled={running}
          rows={5}
        />
        <div style={S.charCount}>{parseSmilesList(smilesText).length} SMILES detected</div>
      </div>

      {/* ── Run / Stop ── */}
      <div style={S.inputRow}>
        <button
          onClick={running ? handleStop : handleRun}
          style={{ ...S.btn, background: running ? "#c0392b" : "#6c3fc5", minWidth: 140 }}
        >
          {running
            ? `⏹ Stop (${progress.done}/${progress.total})`
            : `▶ Run ADMET${parseSmilesList(smilesText).length > 1 ? ` (${parseSmilesList(smilesText).length})` : ""}`}
        </button>
        {allResults.length > 0 && !running && (
          <>
            <button onClick={handleSaveCSV} style={S.outlineBtn}>💾 Save CSV</button>
            <button onClick={handleCopyAll} style={S.outlineBtn}>{copied ? "✅ Copied!" : "📋 Copy All"}</button>
          </>
        )}
      </div>

      {/* ── LOADING ANIMATION ── */}
      {running && (
        <LoadingOverlay
          current={progress.current}
          done={progress.done}
          total={progress.total}
        />
      )}

      {error && <div style={S.errBox}>⚠️ {error}</div>}

      {/* ── Repair toggle ── */}
      <div style={S.repairToggleWrap}>
        <button onClick={() => setShowRepair(v => !v)} style={S.repairToggleBtn}>
          🔧 {showRepair ? "Hide" : "Open"} SMILES Repair Tool
          <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>
            — Fix dots, @, Mg2+, salts &amp; more
          </span>
        </button>
      </div>

      {showRepair && (
        <RepairPanel
          onUseRepaired={handleUseRepaired}
          initialSmiles={incomingRepairSmiles}
          onInitialSmilesConsumed={() => setIncomingRepairSmiles("")}
        />
      )}

      {/* ── Result tabs ── */}
      {allResults.length > 1 && (
        <div style={S.resultTabs}>
          {allResults.map((r, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              style={{
                ...S.resultTab,
                borderColor: r.error ? "#e74c3c" : "#6c3fc5",
                color: r.error ? "#e74c3c" : activeIdx === i ? "#fff" : "#6c3fc5",
                background: activeIdx === i ? (r.error ? "#e74c3c" : "#6c3fc5") : "#fff",
              }}
            >
              {r.error ? "❌" : "✅"} #{i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ── Single result panel ── */}
      {activeResult && (
        <div style={{ marginTop: 20 }}>
          <div style={S.smilesInfo}>
            <div style={{ marginBottom: 4 }}>
              <span style={S.smilesLabel}>Input SMILES: </span>
              <code style={S.smilesCode}>{activeResult.originalSmiles}</code>
            </div>
            {activeResult.repairedSmiles && activeResult.repairedSmiles !== activeResult.originalSmiles && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ ...S.smilesLabel, color: "#e67e22" }}>🔧 Repaired: </span>
                <code style={{ ...S.smilesCode, color: "#e67e22" }}>{activeResult.repairedSmiles}</code>
              </div>
            )}
            {activeResult.repairNote && <div style={S.repairNote}>ℹ️ {activeResult.repairNote}</div>}
            {activeResult.error && <div style={S.errBox}>❌ {activeResult.error}</div>}
          </div>

          {activeResult.result && (
            <>
              <div style={S.resHeader}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#6c3fc5" }}>Prediction Results</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const text = Object.entries(CATEGORIES)
                        .flatMap(([cat, props]) => [`\n=== ${cat} ===`, ...props.map(p => `${p}: ${activeResult.result[p] ?? "-"}`)])
                        .join("\n");
                      navigator.clipboard.writeText(`SMILES: ${activeResult.originalSmiles}\n` + text)
                        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
                    }}
                    style={S.dlBtn}
                  >
                    {copied ? "✅ Copied!" : "📋 Copy Result"}
                  </button>
                  <button onClick={handleSaveCSV} style={S.dlBtn}>💾 Save CSV</button>
                </div>
              </div>

              {Object.entries(CATEGORIES).map(([cat, props]) => (
                <div key={cat} style={{ marginBottom: 22 }}>
                  <div style={{ ...S.catHead, background: CAT_COLORS[cat] }}>{cat}</div>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, width: "52%" }}>Property</th>
                        <th style={S.th}>Prediction / Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.map((prop, i) => {
                        const val = activeResult.result[prop] ?? "-";
                        return (
                          <tr key={prop} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={S.td}>{prop}</td>
                            <td style={{ ...S.td, fontWeight: 600, color: getColor(String(val)) }}>{String(val)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              <div style={{ textAlign: "center", paddingBottom: 28, marginTop: 8, display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={() => {
                    const text = Object.entries(CATEGORIES)
                      .flatMap(([cat, props]) => [`\n=== ${cat} ===`, ...props.map(p => `${p}: ${activeResult.result[p] ?? "-"}`)])
                      .join("\n");
                    navigator.clipboard.writeText(`SMILES: ${activeResult.originalSmiles}\n` + text)
                      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
                  }}
                  style={{ ...S.dlBtn, padding: "10px 28px", fontSize: 14 }}
                >
                  {copied ? "✅ Copied!" : "📋 Copy Result"}
                </button>
                <button onClick={handleSaveCSV} style={{ ...S.dlBtn, padding: "10px 28px", fontSize: 14 }}>
                  💾 Save as CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { padding: "24px 28px", maxWidth: 980, margin: "0 auto", fontFamily: "Inter, sans-serif" },
  title: { fontSize: 26, color: "#6c3fc5", fontStyle: "italic", margin: 0 },
  sub: { color: "#777", fontSize: 13, marginTop: 4, marginBottom: 16 },
  tabRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" },
  tab: { padding: "7px 16px", fontSize: 13, borderRadius: 6, border: "1.5px solid #d0c4f0", background: "#fff", color: "#6c3fc5", cursor: "pointer", fontWeight: 500 },
  tabActive: { background: "#6c3fc5", color: "#fff", border: "1.5px solid #6c3fc5" },
  fileTag: { fontSize: 12, color: "#555", background: "#f3f0ff", border: "1px solid #d0c4f0", borderRadius: 5, padding: "4px 10px" },
  textarea: { width: "100%", padding: "10px 14px", fontSize: 13, border: "1.5px solid #d0c4f0", borderRadius: 7, outline: "none", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 },
  charCount: { position: "absolute", bottom: 8, right: 12, fontSize: 11, color: "#aaa", pointerEvents: "none" },
  inputRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" },
  btn: { color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  outlineBtn: { background: "#fff", color: "#6c3fc5", border: "1.5px solid #6c3fc5", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  errBox: { color: "#c0392b", background: "#fff0f0", border: "1px solid #f5c6cb", borderRadius: 6, padding: "10px 14px", fontSize: 13, marginTop: 8, marginBottom: 8 },
  repairToggleWrap: { margin: "16px 0 0" },
  repairToggleBtn: { background: "#fffbeb", color: "#b45309", border: "1.5px solid #f0c040", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "left" },
  repairPanel: { background: "#fffdf0", border: "1.5px solid #f0c040", borderRadius: 10, padding: "20px 22px", marginTop: 8, marginBottom: 16 },
  repairHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  repairBadge: { fontSize: 11, color: "#92400e", background: "#fef3c7", border: "1px solid #f0c040", borderRadius: 20, padding: "3px 10px", fontWeight: 600 },
  repairDesc: { fontSize: 12.5, color: "#555", marginBottom: 10, lineHeight: 1.6 },
  inlineCode: { background: "#fff8e1", border: "1px solid #f0c040", borderRadius: 3, padding: "1px 5px", fontSize: 12, fontFamily: "monospace" },
  repairRow: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px" },
  repairField: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  repairFieldLabel: { fontSize: 11, fontWeight: 700, color: "#555", minWidth: 72, paddingTop: 2 },
  changeTag: { fontSize: 11, background: "#fef3c7", color: "#92400e", border: "1px solid #f0c040", borderRadius: 4, padding: "2px 8px", fontWeight: 600 },
  noChangeTag: { fontSize: 11, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 },
  miniBtn: { fontSize: 11, padding: "3px 10px", borderRadius: 5, border: "1px solid #d0c4f0", background: "#fff", color: "#6c3fc5", cursor: "pointer", fontWeight: 600 },
  stepsList: { margin: "6px 0 0 4px", padding: 0, listStyle: "none" },
  resultTabs: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16, marginBottom: 4 },
  resultTab: { padding: "5px 14px", fontSize: 12, borderRadius: 20, border: "1.5px solid #6c3fc5", cursor: "pointer", fontWeight: 600, transition: "all 0.15s" },
  smilesInfo: { background: "#f8f6ff", border: "1px solid #e0d8f8", borderRadius: 8, padding: "12px 16px", marginBottom: 14 },
  smilesLabel: { fontSize: 12, fontWeight: 700, color: "#555" },
  smilesCode: { fontSize: 12, background: "#fff", border: "1px solid #e0d8f8", borderRadius: 4, padding: "2px 7px", wordBreak: "break-all" },
  repairNote: { fontSize: 12, color: "#e67e22", marginTop: 4, background: "#fff8f0", border: "1px solid #f5ddb3", borderRadius: 5, padding: "5px 10px" },
  resHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 },
  dlBtn: { background: "#6c3fc5", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  catHead: { color: "#fff", padding: "7px 14px", borderRadius: "6px 6px 0 0", fontWeight: 700, fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, border: "1px solid #eee" },
  th: { background: "#6c3fc5", color: "#fff", padding: "8px 12px", textAlign: "left", fontWeight: 600 },
  td: { padding: "7px 12px", borderBottom: "1px solid #eee", color: "#333" },
};