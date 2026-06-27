import React, { useState, useEffect, useRef } from "react";
import { saveFile } from "../../utils/downloadHelper";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  ArrowLeft, Copy, Download, FlaskConical, Dna, Globe,
  MapPin, Syringe, Layers, Activity, Users, BookOpen, Link2,
  ChevronDown, ChevronUp, Box, Zap, Database, BarChart2,
  Info, AlertCircle, CheckCircle, Clock, ZoomIn, ZoomOut, RotateCcw, Maximize2
} from "lucide-react";

function Badge({ text, color = "#2563eb" }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      background: color + "18", color, fontSize: 12, fontWeight: 600,
      border: `1px solid ${color}33`, marginRight: 6, marginBottom: 4
    }}>{text}</span>
  );
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
      overflow: "hidden", marginBottom: 20,
      boxShadow: "0 1px 8px 0 rgba(37,99,235,0.06)"
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px", background: "none", border: "none", cursor: "pointer",
        borderBottom: open ? "1px solid #e2e8f0" : "none"
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 16, color: "#1e3a8a" }}>
          {Icon && <Icon size={18} color="#2563eb" />} {title}
        </span>
        {open ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
      </button>
      {open && <div style={{ padding: "20px 24px" }}>{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 14 }}>
      <span style={{ color: "#64748b", minWidth: 160, fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#1e293b", flex: 1, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function AnimatedBar({ value, max = 100, color = "#2563eb", delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, Math.max(0, (value / max) * 100))), 200 + delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 8, height: 8, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 8, transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

// ── 3D Mol Viewer ─────────────────────────────────────────────────────────────
function MolViewer({ pdbId }) {
  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [styleMode, setStyleMode] = useState("cartoon");

  useEffect(() => {
    if (!pdbId) return;
    setStatus("loading");

    const load3Dmol = () => {
      if (!viewerRef.current) return;
      const container = viewerRef.current;
      container.innerHTML = "";
      try {
        const viewer = window.$3Dmol.createViewer(container, {
          backgroundColor: "black",
          antialias: true,
        });
        viewerInstanceRef.current = viewer;
        fetch(`https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`)
          .then(r => { if (!r.ok) throw new Error("failed"); return r.text(); })
          .then(pdbData => {
            viewer.addModel(pdbData, "pdb");
            viewer.setStyle({}, { cartoon: { color: "spectrum" } });
            viewer.zoomTo();
            viewer.render();
            setStatus("ready");
          })
          .catch(() => {
            fetch(`https://files.rcsb.org/download/${pdbId.toUpperCase()}.cif`)
              .then(r => r.text())
              .then(cifData => {
                viewer.addModel(cifData, "mmcif");
                viewer.setStyle({}, { cartoon: { color: "spectrum" } });
                viewer.zoomTo();
                viewer.render();
                setStatus("ready");
              })
              .catch(() => setStatus("error"));
          });
      } catch (e) { setStatus("error"); }
    };

    if (window.$3Dmol) {
      load3Dmol();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.3/3Dmol-min.js";
      script.async = true;
      script.onload = load3Dmol;
      script.onerror = () => setStatus("error");
      document.head.appendChild(script);
    }
    return () => {
      if (viewerInstanceRef.current) {
        try { viewerInstanceRef.current.clear(); } catch (e) {}
      }
    };
  }, [pdbId]);

  const applyStyle = (mode) => {
    setStyleMode(mode);
    if (!viewerInstanceRef.current) return;
    const v = viewerInstanceRef.current;
    v.setStyle({}, {});
    if (mode === "cartoon") v.setStyle({}, { cartoon: { color: "spectrum" } });
    else if (mode === "stick") v.setStyle({}, { stick: { colorscheme: "rasmol" } });
    else if (mode === "sphere") v.setStyle({}, { sphere: { colorscheme: "rasmol" } });
    else if (mode === "surface") {
      v.setStyle({}, { cartoon: { color: "spectrum", opacity: 0.6 } });
      v.addSurface(window.$3Dmol.SurfaceType.VDW, { opacity: 0.7, colorscheme: "whiteCarbon" });
    }
    v.render();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Style:</span>
        {["cartoon", "stick", "sphere", "surface"].map(mode => (
          <button key={mode} onClick={() => applyStyle(mode)} style={{
            padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: styleMode === mode ? "#2563eb" : "#eff6ff",
            color: styleMode === mode ? "#fff" : "#2563eb"
          }}>{mode}</button>
        ))}
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
          Drag to rotate · Scroll to zoom · Right-click to pan
        </span>
      </div>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
        {status === "loading" && (
          <div style={{ position: "absolute", inset: 0, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, borderRadius: 10 }}>
            <div style={{ width: 44, height: 44, border: "4px solid #334155", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.9s linear infinite", marginBottom: 14 }} />
            <p style={{ color: "#94a3b8", fontWeight: 600, fontSize: 14 }}>Loading {pdbId}…</p>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#0f172a", height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 10 }}>
            <AlertCircle size={36} color="#64748b" style={{ marginBottom: 10 }} />
            <p style={{ color: "#64748b", fontSize: 14 }}>Could not load structure for {pdbId}</p>
          </div>
        )}
        <div ref={viewerRef} style={{ width: "100%", height: 420, background: "#000", borderRadius: 10 }} />
      </div>
    </div>
  );
}

// ── AlphaFold Viewer ──────────────────────────────────────────────────────────
function AlphaFoldViewer({ accession }) {
  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [styleMode, setStyleMode] = useState("cartoon");

  useEffect(() => {
    if (!accession) return;
    setStatus("loading");

    const loadAF = () => {
      if (!viewerRef.current) return;
      const container = viewerRef.current;
      container.innerHTML = "";
      try {
        const viewer = window.$3Dmol.createViewer(container, {
          backgroundColor: "black",
          antialias: true,
        });
        viewerInstanceRef.current = viewer;
        fetch(`https://alphafold.ebi.ac.uk/files/AF-${accession}-F1-model_v4.pdb`)
          .then(r => { if (!r.ok) throw new Error("failed"); return r.text(); })
          .then(pdbData => {
            viewer.addModel(pdbData, "pdb");
            viewer.setStyle({}, {
              cartoon: {
                colorfunc: (atom) => {
                  const b = atom.b;
                  if (b >= 90) return "#0053D6";
                  if (b >= 70) return "#65CBF3";
                  if (b >= 50) return "#FFDB13";
                  return "#FF7D45";
                }
              }
            });
            viewer.zoomTo();
            viewer.render();
            setStatus("ready");
          })
          .catch(() => setStatus("error"));
      } catch (e) { setStatus("error"); }
    };

    if (window.$3Dmol) {
      loadAF();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.3/3Dmol-min.js";
      script.async = true;
      script.onload = loadAF;
      script.onerror = () => setStatus("error");
      document.head.appendChild(script);
    }
    return () => {
      if (viewerInstanceRef.current) {
        try { viewerInstanceRef.current.clear(); } catch (e) {}
      }
    };
  }, [accession]);

  const applyStyle = (mode) => {
    setStyleMode(mode);
    if (!viewerInstanceRef.current) return;
    const v = viewerInstanceRef.current;
    v.setStyle({}, {});
    if (mode === "cartoon") {
      v.setStyle({}, {
        cartoon: {
          colorfunc: (atom) => {
            const b = atom.b;
            if (b >= 90) return "#0053D6";
            if (b >= 70) return "#65CBF3";
            if (b >= 50) return "#FFDB13";
            return "#FF7D45";
          }
        }
      });
    } else if (mode === "stick") v.setStyle({}, { stick: { colorscheme: "rasmol" } });
    else if (mode === "sphere") v.setStyle({}, { sphere: { colorscheme: "rasmol" } });
    v.render();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Style:</span>
        {["cartoon", "stick", "sphere"].map(mode => (
          <button key={mode} onClick={() => applyStyle(mode)} style={{
            padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: styleMode === mode ? "#2563eb" : "#eff6ff",
            color: styleMode === mode ? "#fff" : "#2563eb"
          }}>{mode}</button>
        ))}
        <div style={{ display: "flex", gap: 8, marginLeft: 12, alignItems: "center", flexWrap: "wrap" }}>
          {[["#0053D6", "Very high (≥90)"], ["#65CBF3", "High (70–90)"], ["#FFDB13", "Medium (50–70)"], ["#FF7D45", "Low (<50)"]].map(([c, l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: "inline-block" }} />
              <span style={{ color: "#64748b" }}>{l}</span>
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>Drag to rotate · Scroll to zoom</span>
      </div>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b" }}>
        {status === "loading" && (
          <div style={{ position: "absolute", inset: 0, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            <div style={{ width: 44, height: 44, border: "4px solid #334155", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.9s linear infinite", marginBottom: 14 }} />
            <p style={{ color: "#94a3b8", fontWeight: 600, fontSize: 14 }}>Loading AlphaFold structure…</p>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#0f172a", height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={36} color="#64748b" style={{ marginBottom: 10 }} />
            <p style={{ color: "#64748b", fontSize: 14 }}>AlphaFold structure not available for {accession}</p>
          </div>
        )}
        <div ref={viewerRef} style={{ width: "100%", height: 420, background: "#000" }} />
      </div>
    </div>
  );
}

// ── Sequence Viewer ───────────────────────────────────────────────────────────
function SequenceViewer({ sequence, accession, name, gene, organism }) {
  const [copied, setCopied] = useState(false);
  const { addDownloadedProtein, user, downloadedProteins = [] } = useWorkspace();
  const isAlreadyAdded = downloadedProteins.some(p => p.accession === accession && p.format === "fasta");

  if (!sequence) return <p style={{ color: "#94a3b8" }}>Sequence not available.</p>;

  const hydrophobic = "AVILMFYW", charged = "DEKRH", polar = "STNQ", special = "CGP";
  const getColor = aa => {
    if (hydrophobic.includes(aa)) return "#1d4ed8";
    if (charged.includes(aa)) return "#dc2626";
    if (polar.includes(aa)) return "#059669";
    if (special.includes(aa)) return "#d97706";
    return "#64748b";
  };
  const chunks = [];
  for (let i = 0; i < sequence.length; i += 10) chunks.push(sequence.slice(i, i + 10));

  const copySeq = () => { navigator.clipboard.writeText(sequence); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const downloadFasta = async () => {
    const content = `>${accession || "protein"} ${name || ""}\n${sequence.match(/.{1,60}/g).join("\n")}\n`;
    await saveFile(content, `${accession || "sequence"}.fasta`, 'FASTA Sequence Files', { 'text/plain': ['.fasta'] });
  };

  const handleToggleWorkspace = () => {
    if (!user) {
      alert("Please sign in to save proteins to your project.");
      return;
    }
    if (isAlreadyAdded) {
      alert("This protein sequence is already in your project.");
    } else {
      addDownloadedProtein({
        accession: accession,
        entryName: name || accession,
        gene: gene || "N/A",
        organism: organism || "N/A",
        format: 'fasta',
        label: `${accession} (FASTA)`,
        content: `>${accession} ${name || ""}\n${sequence.match(/.{1,60}/g).join("\n")}\n`,
        addedAt: new Date().toISOString()
      });
      alert(`Added ${accession} (FASTA) to your project.`);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={copySeq} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: copied ? "#059669" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy Sequence"}
        </button>
        <button onClick={downloadFasta} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <Download size={14} /> Download FASTA
        </button>
        <button 
          onClick={handleToggleWorkspace}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 6, 
            padding: "7px 16px", 
            background: isAlreadyAdded ? "#10b981" : "#eff6ff", 
            color: isAlreadyAdded ? "#fff" : "#2563eb", 
            border: isAlreadyAdded ? "1px solid #10b981" : "1px solid #bfdbfe", 
            borderRadius: 8, 
            cursor: "pointer", 
            fontSize: 13, 
            fontWeight: 600 
          }}
        >
          📁 {isAlreadyAdded ? "Added to Project" : "Add to Project"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[["Hydrophobic", "#1d4ed8"], ["Charged", "#dc2626"], ["Polar", "#059669"], ["Special", "#d97706"]].map(([l, c]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <span style={{ width: 12, height: 12, background: c, borderRadius: 3, display: "inline-block" }} />
            <span style={{ color: "#475569" }}>{l}</span>
          </span>
        ))}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 2, background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {chunks.map((chunk, ci) => (
          <React.Fragment key={ci}>
            <span style={{ color: "#94a3b8", userSelect: "none", marginRight: 8, fontSize: 11 }}>{String(ci * 10 + 1).padStart(5, " ")}</span>
            {chunk.split("").map((aa, ai) => <span key={ai} style={{ color: getColor(aa), fontWeight: 600 }}>{aa}</span>)}
            {" "}
          </React.Fragment>
        ))}
      </div>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>Length: <strong>{sequence.length}</strong> amino acids</p>
    </div>
  );
}

// ── Subcellular — data only, no image ─────────────────────────────────────────
function SubcellularSection({ accession, subcellLocations, subcellComments, goRefs }) {
  const [subTab, setSubTab] = useState("uniprot");

  const goLocations = goRefs.filter(r => {
    const term = r.properties?.find(p => p.key === "GoTerm")?.value || "";
    return term.startsWith("C:");
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #e2e8f0" }}>
        {[["uniprot", "Annotation"], ["go", "GO Annotation"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} style={{
            padding: "10px 22px", border: "none", cursor: "pointer", fontSize: 14,
            fontWeight: subTab === id ? 700 : 500, background: "none",
            color: subTab === id ? "#2563eb" : "#64748b",
            borderBottom: subTab === id ? "2px solid #2563eb" : "2px solid transparent",
            marginBottom: -2
          }}>{label}</button>
        ))}
      </div>

      {subTab === "uniprot" && (
        <div>
          <p style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 14, marginBottom: 10 }}>Locations</p>
          {subcellLocations.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subcellLocations.map((loc, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 16px", background: "#eff6ff",
                  borderRadius: 8, border: "1px solid #bfdbfe", fontSize: 14
                }}>
                  <MapPin size={14} color="#2563eb" />
                  <span style={{ color: "#1e40af", fontWeight: 600 }}>{loc}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No subcellular location data available for this entry.</p>
          )}
          {subcellComments.map((c, i) =>
            c.note?.texts?.map((t, j) => (
              <p key={`${i}${j}`} style={{ color: "#475569", fontSize: 13, marginTop: 12, lineHeight: 1.7 }}>{t.value}</p>
            ))
          )}
        </div>
      )}

      {subTab === "go" && (
        <div>
          <p style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 14, marginBottom: 10 }}>GO Cellular Components</p>
          {goLocations.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No GO cellular component terms found for this entry.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {goLocations.map((ref, i) => {
                const termFull = ref.properties?.find(p => p.key === "GoTerm")?.value || "";
                const termName = termFull.split(":").slice(1).join(":").trim();
                const evidence = ref.properties?.find(p => p.key === "GoEvidenceType")?.value || "";
                const goId = ref.id || "";
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 16px", background: "#f8fafc",
                    borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13
                  }}>
                    <MapPin size={12} color="#0284c7" />
                    <span style={{ color: "#1e293b", fontWeight: 600, flex: 1 }}>{termName}</span>
                    {goId && (
                      <span style={{ fontFamily: "monospace", color: "#64748b", fontSize: 11 }}>{goId}</span>
                    )}
                    {evidence && (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {evidence}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Structure Section ─────────────────────────────────────────────────────────
function StructureSection({ pdbRefs, accession, alphafoldRefs }) {
  const [selectedPdb, setSelectedPdb] = useState(null);
  const [useAF, setUseAF] = useState(false);
  const [methodFilter, setMethodFilter] = useState("All");

  const methods = ["All", ...new Set(pdbRefs.map(r => r.properties?.find(p => p.key === "Method")?.value).filter(Boolean))];
  const filteredPdb = methodFilter === "All" ? pdbRefs : pdbRefs.filter(r => r.properties?.find(p => p.key === "Method")?.value === methodFilter);

  const loadStructure = (pdbId, isAF = false) => {
    setUseAF(isAF);
    if (!isAF) setSelectedPdb(pdbId);
    else setSelectedPdb(null);
  };

  const viewerPdbId = !useAF ? (selectedPdb || pdbRefs[0]?.id || null) : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        {viewerPdbId && !useAF ? (
          <MolViewer pdbId={viewerPdbId} />
        ) : useAF ? (
          <AlphaFoldViewer accession={accession} />
        ) : (
          <div style={{ background: "#0f172a", borderRadius: 10, height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #1e293b" }}>
            <Box size={48} color="#334155" style={{ marginBottom: 14 }} />
            <p style={{ color: "#64748b", fontWeight: 600, fontSize: 15 }}>Select a structure below to view</p>
            {pdbRefs.length > 0 && <p style={{ color: "#475569", fontSize: 13, marginTop: 6 }}>{pdbRefs.length} PDB structure(s) available</p>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => loadStructure(null, true)} style={{
          padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          background: useAF ? "#059669" : "#f0fdf4", color: useAF ? "#fff" : "#059669"
        }}>AlphaFold (Predicted)</button>
        {pdbRefs.slice(0, 8).map(ref => (
          <button key={ref.id} onClick={() => loadStructure(ref.id, false)} style={{
            padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: selectedPdb === ref.id && !useAF ? "#2563eb" : "#eff6ff",
            color: selectedPdb === ref.id && !useAF ? "#fff" : "#2563eb"
          }}>{ref.id}</button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>METHOD</span>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}>
            {methods.map(m => <option key={m}>{m}</option>)}
          </select>
          <span style={{ fontSize: 13, color: "#64748b" }}>{filteredPdb.length} structure(s)</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              {["SOURCE", "ID", "METHOD", "RESOLUTION", "CHAINS", "ACTION"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#374151", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alphafoldRefs.map((ref, i) => (
              <tr key={`af-${i}`} style={{ borderBottom: "1px solid #f1f5f9", background: "#f0fdf4" }}>
                <td style={{ padding: "8px 12px" }}><Badge text="AlphaFold" color="#059669" /></td>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: "#059669", fontFamily: "monospace" }}>{ref.id}</td>
                <td style={{ padding: "8px 12px" }}><Badge text="Predicted" color="#059669" /></td>
                <td colSpan={2} style={{ padding: "8px 12px", color: "#64748b" }}>AI predicted</td>
                <td style={{ padding: "8px 12px" }}>
                  <button onClick={() => loadStructure(null, true)} style={{ padding: "4px 10px", background: useAF ? "#059669" : "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 5, cursor: "pointer", fontSize: 11, color: useAF ? "#fff" : "#059669", fontWeight: 600 }}>
                    {useAF ? "Viewing" : "View"}
                  </button>
                </td>
              </tr>
            ))}
            {filteredPdb.map((ref, i) => {
              const method = ref.properties?.find(p => p.key === "Method")?.value || "–";
              const resolution = ref.properties?.find(p => p.key === "Resolution")?.value || "–";
              const chains = ref.properties?.find(p => p.key === "Chains")?.value || "–";
              const isActive = selectedPdb === ref.id && !useAF;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: isActive ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "8px 12px" }}><Badge text="PDB" color="#2563eb" /></td>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#2563eb", fontFamily: "monospace" }}>{ref.id}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <Badge text={method} color={method === "NMR" ? "#7c3aed" : method === "X-ray" ? "#0284c7" : "#64748b"} />
                  </td>
                  <td style={{ padding: "8px 12px", color: "#374151" }}>{resolution}</td>
                  <td style={{ padding: "8px 12px", color: "#374151", fontSize: 11, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chains}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <button onClick={() => loadStructure(ref.id)} style={{
                      padding: "4px 10px", background: isActive ? "#2563eb" : "#eff6ff",
                      border: "1px solid #bfdbfe", borderRadius: 5, cursor: "pointer",
                      fontSize: 11, color: isActive ? "#fff" : "#2563eb", fontWeight: 600
                    }}>{isActive ? "Viewing" : "View"}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredPdb.length === 0 && alphafoldRefs.length === 0 && (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: 24 }}>No structures available for this entry.</p>
        )}
      </div>
    </div>
  );
}

// ── PTM Feature Track ─────────────────────────────────────────────────────────
function PTMFeatureTrack({ features, sequence }) {
  const seqLen = sequence?.length || 110;
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [zoom, setZoom] = useState(1);

  const typeConfig = {
    "Signal peptide":   { color: "#ef4444", label: "Signal", row: 0 },
    "Peptide":          { color: "#3b82f6", label: "Peptide", row: 1 },
    "Propeptide":       { color: "#8b5cf6", label: "Propeptide", row: 1 },
    "Chain":            { color: "#3b82f6", label: "Chain", row: 1 },
    "Disulfide bond":   { color: "#dc2626", label: "Disulfide", row: 2 },
    "Modified residue": { color: "#f59e0b", label: "Mod.Res", row: 3 },
    "Glycosylation":    { color: "#10b981", label: "Glycan", row: 3 },
    "Lipidation":       { color: "#f97316", label: "Lipid", row: 3 },
    "Cross-link":       { color: "#6366f1", label: "X-Link", row: 3 },
    "Transmembrane":    { color: "#0ea5e9", label: "TM", row: 0 },
    "Helix":            { color: "#a78bfa", label: "Helix", row: 4 },
    "Beta strand":      { color: "#34d399", label: "β-Strand", row: 4 },
    "Turn":             { color: "#fb923c", label: "Turn", row: 4 },
  };

  const trackWidth = 700;
  const rowHeight = 22;
  const rulerH = 40;
  const svgH = rulerH + 5 * rowHeight + 20;
  const scale = (pos) => ((pos - 1) / seqLen) * trackWidth * zoom;
  const tickInterval = seqLen <= 200 ? 10 : seqLen <= 500 ? 25 : 100;
  const ticks = [];
  for (let i = 0; i <= seqLen; i += tickInterval) ticks.push(i);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {Object.entries(typeConfig).filter(([type]) => features.some(f => f.type === type)).map(([type, cfg]) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <span style={{ width: 14, height: 10, background: cfg.color, borderRadius: 2, display: "inline-block" }} />
            <span style={{ color: "#475569" }}>{cfg.label}</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setZoom(z => Math.min(z * 1.5, 8))} style={{ padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer" }}><ZoomIn size={14} /></button>
        <button onClick={() => setZoom(z => Math.max(z / 1.5, 1))} style={{ padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer" }}><ZoomOut size={14} /></button>
        <button onClick={() => setZoom(1)} style={{ padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#64748b" }}>Reset</button>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <svg width={Math.max(trackWidth * zoom, 400)} height={svgH} style={{ display: "block" }}>
          <rect x={0} y={0} width={trackWidth * zoom} height={rulerH} fill="#f1f5f9" />
          <rect x={0} y={rulerH - 10} width={trackWidth * zoom} height={6} fill="#dc2626" rx={2} />
          {ticks.map(tick => (
            <g key={tick}>
              <line x1={scale(tick + 1)} y1={rulerH - 12} x2={scale(tick + 1)} y2={rulerH - 4} stroke="#6b7280" strokeWidth={1} />
              <text x={scale(tick + 1)} y={rulerH - 16} textAnchor="middle" fontSize={9} fill="#6b7280">{tick}</text>
            </g>
          ))}
          {features.map((feat, fi) => {
            const cfg = typeConfig[feat.type];
            if (!cfg) return null;
            const start = feat.location?.start?.value || 1;
            const end = feat.location?.end?.value || start;
            const x1 = scale(start);
            const x2 = scale(end + 1);
            const w = Math.max(x2 - x1, 4);
            const y = rulerH + cfg.row * rowHeight + 4;
            if (feat.type === "Disulfide bond") {
              const cx1 = scale(start), cx2 = scale(end);
              const mid = (cx1 + cx2) / 2;
              const arcH = Math.min(16, Math.abs(cx2 - cx1) * 0.4);
              return (
                <g key={fi} onMouseEnter={() => setHoveredFeature(feat)} onMouseLeave={() => setHoveredFeature(null)} style={{ cursor: "pointer" }}>
                  <path d={`M${cx1},${y + 8} Q${mid},${y + 8 - arcH} ${cx2},${y + 8}`} fill="none" stroke={cfg.color} strokeWidth={2} />
                  <circle cx={cx1} cy={y + 8} r={3} fill={cfg.color} />
                  <circle cx={cx2} cy={y + 8} r={3} fill={cfg.color} />
                </g>
              );
            }
            return (
              <g key={fi} onMouseEnter={() => setHoveredFeature(feat)} onMouseLeave={() => setHoveredFeature(null)} style={{ cursor: "pointer" }}>
                <rect x={x1} y={y} width={w} height={16} rx={3} fill={cfg.color} opacity={0.85} />
                {w > 30 && <text x={x1 + w / 2} y={y + 11} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={600}>{cfg.label}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      {hoveredFeature && (
        <div style={{ marginTop: 10, padding: "10px 16px", background: "#1e3a8a", color: "#fff", borderRadius: 8, fontSize: 13 }}>
          <strong>{hoveredFeature.type}</strong>
          {hoveredFeature.location && <span> · Pos {hoveredFeature.location.start?.value}–{hoveredFeature.location.end?.value}</span>}
          {hoveredFeature.description?.value && <span> · {hoveredFeature.description.value}</span>}
        </div>
      )}
      <div style={{ marginTop: 20, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              {["TYPE", "ID", "POSITION(S)", "DESCRIPTION", "EVIDENCE"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#374151", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.filter(f => typeConfig[f.type]).map((feat, i) => {
              const cfg = typeConfig[feat.type];
              const start = feat.location?.start?.value;
              const end = feat.location?.end?.value;
              const pos = feat.type === "Disulfide bond"
                ? `${start}↔${end}`
                : (start && end && start !== end ? `${start}–${end}` : `${start || "–"}`);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, background: cfg.color, borderRadius: 2, display: "inline-block" }} />
                      <span style={{ fontWeight: 600, color: "#1e293b" }}>{feat.type}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#2563eb", fontSize: 12 }}>{feat.featureId || "–"}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>{pos}</td>
                  <td style={{ padding: "10px 12px", color: "#475569" }}>{feat.description?.value || "–"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {feat.evidences?.length > 0 && (
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {feat.evidences.length} pub{feat.evidences.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Interactions — table only, no links ───────────────────────────────────────
function InteractionsSection({ interactions, subunits, accession }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const filtered = typeFilter === "All" ? interactions : interactions.filter(i => (i.interactionType || "BINARY") === typeFilter);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>TYPE</span>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }}>
          <option>All</option><option>BINARY</option><option>SELF</option>
        </select>
        <span style={{ fontSize: 13, color: "#64748b" }}>{filtered.length} interaction(s)</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              {["TYPE", "ENTRY 1", "ENTRY 2", "GENE", "EXPERIMENTS", "INTACT ID"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#374151", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No interaction data available for this entry.</td></tr>
            ) : filtered.map((inter, i) => {
              const entry1 = inter.interactantOne?.uniProtkbAccession || accession || "–";
              const entry2acc = inter.interactantTwo?.uniProtkbAccession || "–";
              const entry2gene = inter.interactantTwo?.geneName || "–";
              const experiments = inter.numberOfExperiments || "–";
              const intAct1 = inter.interactantOne?.intActId || "–";
              const intAct2 = inter.interactantTwo?.intActId || "–";
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "10px 12px" }}><Badge text={inter.interactionType || "BINARY"} color="#1e40af" /></td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#2563eb", fontWeight: 600 }}>{entry1}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#374151", fontWeight: 600 }}>{entry2acc}</td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>{entry2gene}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#374151", textAlign: "center" }}>{experiments}</td>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                    {[intAct1, intAct2].filter(x => x !== "–").join(", ") || "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {subunits.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 14, marginBottom: 10 }}>Subunit / Complex Info</p>
          {subunits.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
        </div>
      )}
    </div>
  );
}

// ── GO Terms ──────────────────────────────────────────────────────────────────
function GOTerms({ goTerms }) {
  if (!goTerms || goTerms.length === 0) return <p style={{ color: "#94a3b8" }}>No GO terms available.</p>;
  const grouped = { F: [], P: [], C: [] };
  goTerms.forEach(g => {
    const termStr = g.properties?.find(p => p.key === "GoTerm")?.value || "";
    const aspect = termStr.split(":")[0] || "F";
    const termName = termStr.split(":").slice(1).join(":").trim() || g.id;
    if (grouped[aspect] !== undefined) grouped[aspect].push({ ...g, termName });
  });
  const labels = { F: "Molecular Function", P: "Biological Process", C: "Cellular Component" };
  const colors = { F: "#2563eb", P: "#059669", C: "#d97706" };
  return (
    <div>
      {Object.entries(grouped).filter(([, v]) => v.length > 0).map(([aspect, terms]) => (
        <div key={aspect} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 700, color: colors[aspect], fontSize: 13, marginBottom: 8 }}>{labels[aspect]}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {terms.map((t, i) => (
              <span key={i} style={{ background: colors[aspect] + "12", color: colors[aspect], border: `1px solid ${colors[aspect]}33`, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 500 }}>
                {t.termName}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Expression Chart ──────────────────────────────────────────────────────────
function ExpressionChart({ tissueTexts }) {
  if (!tissueTexts || tissueTexts.length === 0)
    return <p style={{ color: "#94a3b8" }}>No expression data available for this entry.</p>;

  const keywords = ["liver","kidney","brain","heart","lung","muscle","pancreas","spleen","thyroid","intestine","stomach","skin","blood","plasma","adipose","testis","ovary","placenta","uterus","prostate","breast","colon","retina","thymus","adrenal","pituitary","bone marrow","lymph node"];
  const parsed = [];
  tissueTexts.forEach(text => {
    const lower = text.toLowerCase();
    keywords.forEach(tissue => {
      if (lower.includes(tissue) && !parsed.find(p => p.tissue === tissue)) {
        const high = lower.includes("highly expressed") || lower.includes("abundant") || lower.includes("strongly expressed") || lower.includes("high level");
        const low = lower.includes("low") || lower.includes("weak") || lower.includes("faint");
        const absent = lower.includes("not expressed") || lower.includes("absent");
        parsed.push({
          tissue: tissue[0].toUpperCase() + tissue.slice(1),
          value: absent ? 5 : low ? 25 : high ? 90 : 55
        });
      }
    });
  });

  if (parsed.length === 0) {
    return (
      <div>
        {tissueTexts.map((t, i) => <p key={i} style={{ color: "#334155", fontSize: 14, lineHeight: 1.8 }}>{t}</p>)}
      </div>
    );
  }

  const maxVal = Math.max(...parsed.map(p => p.value));
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {parsed.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ minWidth: 130, fontSize: 13, color: "#334155", textAlign: "right" }}>{t.tissue}</span>
            <AnimatedBar value={t.value} max={maxVal} delay={i * 60}
              color={t.value >= 80 ? "#059669" : t.value >= 40 ? "#2563eb" : "#94a3b8"} />
            <span style={{ fontSize: 12, color: "#64748b", minWidth: 60 }}>
              {t.value >= 80 ? "High" : t.value >= 40 ? "Medium" : "Low"}
            </span>
          </div>
        ))}
      </div>
      {tissueTexts.map((t, i) => (
        <p key={i} style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, fontStyle: "italic", marginTop: 8 }}>{t}</p>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProteinDetails({ protein, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const accession = protein?.accession || protein?.primaryAccession || protein?.id;

  useEffect(() => {
    if (!accession) { setError("No accession provided."); setLoading(false); return; }
    setLoading(true); setError(null);
    fetch(`https://rest.uniprot.org/uniprotkb/${accession}?format=json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => {
        const msg = e.message.replace(/uniprot\.org|rcsb\.org|files\.rcsb\.org|rest\.uniprot\.org/gi, 'Protein Database');
        setError(msg);
        setLoading(false);
      });
  }, [accession]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff,#f8fafc)" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", border: "4px solid #bfdbfe", borderTopColor: "#2563eb", animation: "spin 0.9s linear infinite" }} />
      <p style={{ color: "#2563eb", fontWeight: 600, fontSize: 15, marginTop: 20 }}>Loading protein data…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <AlertCircle size={40} color="#dc2626" />
      <p style={{ color: "#dc2626", fontWeight: 700, fontSize: 18 }}>Failed to load protein details</p>
      <p style={{ color: "#64748b" }}>{error}</p>
      <button onClick={onBack} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>← Back</button>
    </div>
  );

  const d = data || {};

  const name = d.proteinDescription?.recommendedName?.fullName?.value
    || d.proteinDescription?.submittedName?.[0]?.fullName?.value
    || "Unknown Protein";
  const organism = d.organism?.scientificName || "";
  const commonName = d.organism?.commonName || "";
  const taxonId = d.organism?.taxonId || "";
  const genes = d.genes?.map(g => g.geneName?.value).filter(Boolean) || [];
  const synonyms = d.genes?.flatMap(g => g.synonyms?.map(s => s.value) || []) || [];
  const keywords = d.keywords?.map(k => k.name) || [];
  const sequence = d.sequence?.value || "";
  const seqLength = d.sequence?.length || sequence.length || null;
  const seqMass = d.sequence?.molWeight || null;
  const seqChecksum = d.sequence?.crc64 || "";
  const entryType = d.entryType || "";

  const comments = d.comments || [];
  const getComments = (type) => comments.filter(c => c.commentType === type);

  const functionTexts = getComments("FUNCTION").flatMap(c => c.texts?.map(t => t.value) || []);
  const catalyticActivities = getComments("CATALYTIC ACTIVITY");
  const pathways = getComments("PATHWAY");
  const subunits = getComments("SUBUNIT");
  const subcellComments = getComments("SUBCELLULAR LOCATION");
  const diseases = getComments("DISEASE");
  const ptmComments = getComments("PTM");
  const tissueSpec = getComments("TISSUE SPECIFICITY");
  const developmentalStage = getComments("DEVELOPMENTAL STAGE");
  const induction = getComments("INDUCTION");
  const families = getComments("SIMILARITY");
  const interactions = getComments("INTERACTION").flatMap(c => c.interactions || []);
  const biophysicochemical = getComments("BIOPHYSICOCHEMICAL PROPERTIES");
  const caution = getComments("CAUTION");
  const polymorphism = getComments("POLYMORPHISM");
  const rnaEditing = getComments("RNA EDITING");
  const toxic = getComments("TOXIC DOSE");
  const allergen = getComments("ALLERGEN");
  const pharmaceutical = getComments("PHARMACEUTICAL");
  const massSpec = getComments("MASS SPECTROMETRY");

  const features = d.features || [];
  const getFeatures = (types) => features.filter(f => types.includes(f.type));

  const allPtmFeatures = getFeatures([
    "Signal peptide", "Peptide", "Propeptide", "Chain", "Disulfide bond",
    "Modified residue", "Glycosylation", "Lipidation", "Cross-link",
    "Transmembrane", "Helix", "Beta strand", "Turn"
  ]);
  const domains = getFeatures(["Domain", "Region", "Repeat", "Motif", "Compositional bias", "Zinc finger", "Coiled coil"]);
  const naturalVariants = getFeatures(["Natural variant"]);
  const activeSites = getFeatures(["Active site", "Binding site", "Metal binding", "DNA binding"]);
  const mutagenesis = getFeatures(["Mutagenesis"]);

  const crossRefs = d.uniProtKBCrossReferences || [];
  const getDB = (db) => crossRefs.filter(r => r.database === db);
  const pdbRefs = getDB("PDB");
  const goRefs = getDB("GO");
  const omimRefs = getDB("MIM");
  const alphafoldRefs = getDB("AlphaFoldDB");
  const stringRefs = getDB("STRING");
  const interpro = getDB("InterPro");
  const pfam = getDB("Pfam");

  const subcellLocations = subcellComments.flatMap(c =>
    c.subcellularLocations?.map(sl => sl.location?.value).filter(Boolean) || []
  );
  const tissueTexts = tissueSpec.flatMap(c => c.texts?.map(t => t.value) || []);
  const publications = d.references || [];

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "function", label: "Function", icon: FlaskConical },
    { id: "structure", label: "Structure", icon: Box },
    { id: "expression", label: "Expression", icon: BarChart2 },
    { id: "disease", label: "Disease & Variants", icon: Syringe },
    { id: "ptm", label: "PTM / Processing", icon: Zap },
    { id: "interactions", label: "Interactions", icon: Users },
    { id: "sequence", label: "Sequence", icon: Dna },
    { id: "publications", label: "Publications", icon: BookOpen },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f6ff", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .protein-tab:hover { background: rgba(255,255,255,0.2) !important; }
        .tab-scroll::-webkit-scrollbar { height: 4px; }
        .tab-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 4px 24px rgba(37,99,235,0.25)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                <ArrowLeft size={16} /> Home
              </button>
              <div>
                <span style={{ color: "#bfdbfe", fontSize: 13 }}>Spatial Biologics · Protein Library</span>
                <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "4px 0 2px" }}>{name}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: "#93c5fd", fontSize: 14, fontStyle: "italic" }}>{organism}{commonName ? ` (${commonName})` : ""}</span>
                  {genes.length > 0 && <span style={{ color: "#bfdbfe", fontSize: 13 }}>· Gene: {genes.join(", ")}</span>}
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#e0f2fe", fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>{accession}</span>
              <button onClick={() => { navigator.clipboard.writeText(accession); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: copied ? "#86efac" : "#bfdbfe" }}>
                {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
          <div className="tab-scroll" style={{ display: "flex", gap: 4, marginTop: 18, overflowX: "auto", paddingBottom: 2 }}>
            {tabs.map(t => (
              <button key={t.id} className="protein-tab" onClick={() => setActiveTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
                background: activeTab === t.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                color: activeTab === t.id ? "#fff" : "#bfdbfe",
                fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, whiteSpace: "nowrap",
                borderBottom: activeTab === t.id ? "3px solid #fff" : "3px solid transparent",
                transition: "all 0.2s"
              }}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 60px", animation: "fadeIn 0.4s ease" }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Accession", value: accession, icon: Database },
                { label: "Length", value: seqLength ? `${seqLength} aa` : "–", icon: Dna },
                { label: "Molecular Weight", value: seqMass ? `${(seqMass / 1000).toFixed(1)} kDa` : "–", icon: Activity },
                { label: "Organism", value: organism || "–", icon: Globe },
                { label: "Gene(s)", value: genes.length ? genes.join(", ") : "–", icon: Layers },
                { label: "Entry Status", value: entryType?.toLowerCase().includes("reviewed") ? "Reviewed ✓" : "Unreviewed", icon: CheckCircle },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 6px rgba(37,99,235,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 12, marginBottom: 6 }}>
                    <Icon size={14} color="#2563eb" /> {label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{value}</div>
                </div>
              ))}
            </div>

            <SectionCard title="Names & Taxonomy" icon={Info}>
              <InfoRow label="Recommended Name" value={name} />
              {d.proteinDescription?.alternativeNames?.map((n, i) => (
                <InfoRow key={i} label={i === 0 ? "Alternative Name(s)" : ""} value={n.fullName?.value} />
              ))}
              {synonyms.length > 0 && <InfoRow label="Gene Synonyms" value={synonyms.join(", ")} />}
              <InfoRow label="Organism" value={`${organism}${commonName ? ` (${commonName})` : ""}`} />
              <InfoRow label="Taxonomic ID" value={taxonId?.toString()} />
              <InfoRow label="Lineage" value={d.organism?.lineage?.join(" › ")} />
            </SectionCard>

            {keywords.length > 0 && (
              <SectionCard title="Keywords" icon={Link2}>
                <div>{keywords.map((k, i) => <Badge key={i} text={k} color={i % 3 === 0 ? "#2563eb" : i % 3 === 1 ? "#0284c7" : "#0369a1"} />)}</div>
              </SectionCard>
            )}

            {functionTexts.length > 0 && (
              <SectionCard title="Function Summary" icon={FlaskConical}>
                {functionTexts.map((t, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14, marginBottom: 8 }}>{t}</p>)}
              </SectionCard>
            )}

            {(subcellLocations.length > 0) && (
              <SectionCard title="Subcellular Location" icon={MapPin}>
                <SubcellularSection
                  accession={accession}
                  subcellLocations={subcellLocations}
                  subcellComments={subcellComments}
                  goRefs={goRefs}
                />
              </SectionCard>
            )}

            {diseases.length > 0 && (
              <SectionCard title="Disease Associations" icon={Syringe} defaultOpen={false}>
                {diseases.map((dis, i) => (
                  <div key={i} style={{ marginBottom: 12, padding: "12px 16px", background: "#fff7ed", borderRadius: 10, border: "1px solid #fed7aa" }}>
                    <p style={{ fontWeight: 700, color: "#c2410c", marginBottom: 4 }}>{dis.disease?.name || `Disease ${i + 1}`}</p>
                    {dis.disease?.description && <p style={{ color: "#78350f", fontSize: 13 }}>{dis.disease.description}</p>}
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        )}

        {/* FUNCTION */}
        {activeTab === "function" && (
          <div>
            <SectionCard title="Molecular Function" icon={FlaskConical}>
              {functionTexts.length > 0
                ? functionTexts.map((t, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14, marginBottom: 8 }}>{t}</p>)
                : <p style={{ color: "#94a3b8" }}>No function annotation available.</p>}
            </SectionCard>

            {catalyticActivities.length > 0 && (
              <SectionCard title="Catalytic Activity" icon={Zap}>
                {catalyticActivities.map((c, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: "14px 18px", background: "#eff6ff", borderRadius: 12, border: "1px solid #bfdbfe" }}>
                    {c.reaction?.name && <p style={{ fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>{c.reaction.name}</p>}
                    {c.reaction?.equation && <p style={{ fontFamily: "monospace", color: "#334155", fontSize: 13, background: "#fff", padding: "8px 12px", borderRadius: 8 }}>{c.reaction.equation}</p>}
                    {c.physiologicalReactions?.map((pr, j) => (
                      <p key={j} style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>Direction: {pr.directionType}</p>
                    ))}
                  </div>
                ))}
              </SectionCard>
            )}

            {biophysicochemical.length > 0 && (
              <SectionCard title="Biophysicochemical Properties" icon={Activity}>
                {biophysicochemical.map((c, i) => (
                  <div key={i}>
                    {c.kineticParameters?.michaelisConstants?.map((km, j) => (
                      <div key={j} style={{ padding: "8px 14px", background: "#f0fdf4", borderRadius: 8, marginBottom: 6, fontSize: 13, color: "#166534" }}>
                        <strong>Km:</strong> {km.constant} {km.unit} <span style={{ color: "#64748b" }}>({km.substrate})</span>
                      </div>
                    ))}
                    {c.kineticParameters?.maximumVelocities?.map((vmax, j) => (
                      <div key={j} style={{ padding: "8px 14px", background: "#f0fdf4", borderRadius: 8, marginBottom: 6, fontSize: 13, color: "#166534" }}>
                        <strong>Vmax:</strong> {vmax.velocity} {vmax.unit} <span style={{ color: "#64748b" }}>({vmax.enzyme})</span>
                      </div>
                    ))}
                    {c.phDependence?.texts?.map((t, j) => (
                      <p key={j} style={{ fontSize: 13, color: "#334155", marginTop: 6 }}><strong>pH Dependence:</strong> {t.value}</p>
                    ))}
                    {c.temperatureDependence?.texts?.map((t, j) => (
                      <p key={j} style={{ fontSize: 13, color: "#334155", marginTop: 6 }}><strong>Temperature:</strong> {t.value}</p>
                    ))}
                  </div>
                ))}
              </SectionCard>
            )}

            {pathways.length > 0 && (
              <SectionCard title="Pathways" icon={Activity}>
                {pathways.map((c, i) => (
                  <div key={i} style={{ marginBottom: 8, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, fontSize: 14, color: "#166534" }}>
                    {c.texts?.[0]?.value}
                  </div>
                ))}
              </SectionCard>
            )}

            {subunits.length > 0 && (
              <SectionCard title="Subunit Structure" icon={Users}>
                {subunits.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}

            {families.length > 0 && (
              <SectionCard title="Protein Family" icon={Layers}>
                {families.map((f, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{f.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}

            {goRefs.length > 0 && (
              <SectionCard title="Gene Ontology" icon={Database}>
                <GOTerms goTerms={goRefs} />
              </SectionCard>
            )}

            {caution.length > 0 && (
              <SectionCard title="Caution" icon={AlertCircle}>
                {caution.map((c, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa", fontSize: 13, color: "#92400e" }}>
                    {c.texts?.[0]?.value}
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        )}

        {/* STRUCTURE */}
        {activeTab === "structure" && (
          <div>
            <SectionCard title="3D Structure" icon={Box}>
              <StructureSection pdbRefs={pdbRefs} accession={accession} alphafoldRefs={alphafoldRefs} />
            </SectionCard>

            {domains.length > 0 && (
              <SectionCard title="Domains & Regions" icon={Layers}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {domains.map((feat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                      <Badge text={feat.type} color="#2563eb" />
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{feat.description?.value || "–"}</span>
                      {feat.location && <span style={{ color: "#64748b", fontSize: 13 }}>{feat.location.start?.value}–{feat.location.end?.value}</span>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {interpro.length > 0 && (
              <SectionCard title="InterPro" icon={Database}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {interpro.map((ref, i) => {
                    const n = ref.properties?.find(p => p.key === "EntryName")?.value || "";
                    return (
                      <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                        <strong style={{ color: "#2563eb" }}>{ref.id}</strong>
                        {n && <span style={{ color: "#64748b", marginLeft: 8 }}>{n}</span>}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {pfam.length > 0 && (
              <SectionCard title="Pfam" icon={Database}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {pfam.map((ref, i) => {
                    const n = ref.properties?.find(p => p.key === "EntryName")?.value || "";
                    return (
                      <div key={i} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#1e40af" }}>
                        <strong>{ref.id}</strong>{n && ` – ${n}`}
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* EXPRESSION */}
        {activeTab === "expression" && (
          <div>
            <SectionCard title="Tissue Expression" icon={BarChart2}>
              <ExpressionChart tissueTexts={tissueTexts} />
            </SectionCard>

            {developmentalStage.length > 0 && (
              <SectionCard title="Developmental Stage" icon={Clock}>
                {developmentalStage.map((c, i) => (
                  <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>
                ))}
              </SectionCard>
            )}

            {induction.length > 0 && (
              <SectionCard title="Induction" icon={Zap}>
                {induction.map((c, i) => (
                  <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>
                ))}
              </SectionCard>
            )}
          </div>
        )}

        {/* DISEASE & VARIANTS */}
        {activeTab === "disease" && (
          <div>
            {diseases.length > 0
              ? diseases.map((dis, i) => (
                <SectionCard key={i} title={dis.disease?.name || `Disease ${i + 1}`} icon={Syringe}>
                  {dis.disease?.description && (
                    <p style={{ color: "#334155", lineHeight: 1.8, fontSize: 14, marginBottom: 12 }}>{dis.disease.description}</p>
                  )}
                  {dis.texts?.[0]?.value && (
                    <p style={{ color: "#475569", lineHeight: 1.8, fontSize: 14, fontStyle: "italic" }}>{dis.texts[0].value}</p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {dis.disease?.acronym && <Badge text={dis.disease.acronym} color="#dc2626" />}
                    {omimRefs.map((r, j) => <Badge key={j} text={`OMIM: ${r.id}`} color="#7c3aed" />)}
                  </div>
                </SectionCard>
              ))
              : (
                <SectionCard title="Disease Associations" icon={Syringe}>
                  <p style={{ color: "#94a3b8" }}>No disease associations found for this entry.</p>
                </SectionCard>
              )
            }

            {naturalVariants.length > 0 && (
              <SectionCard title={`Natural Variants (${naturalVariants.length})`} icon={AlertCircle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {naturalVariants.slice(0, 50).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "#fff7ed", borderRadius: 10, border: "1px solid #fed7aa", fontSize: 13 }}>
                      <span style={{ color: "#c2410c", fontWeight: 700, minWidth: 70 }}>Pos {f.location?.start?.value}</span>
                      <span style={{ color: "#334155", flex: 1 }}>{f.description?.value || f.featureId || "Variant"}</span>
                      {f.featureId && <Badge text={f.featureId} color="#d97706" />}
                    </div>
                  ))}
                  {naturalVariants.length > 50 && (
                    <p style={{ color: "#64748b", fontSize: 13 }}>Showing 50 of {naturalVariants.length} variants.</p>
                  )}
                </div>
              </SectionCard>
            )}

            {mutagenesis.length > 0 && (
              <SectionCard title="Mutagenesis" icon={AlertCircle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mutagenesis.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca", fontSize: 13 }}>
                      <span style={{ color: "#dc2626", fontWeight: 700, minWidth: 70 }}>Pos {f.location?.start?.value}</span>
                      <span style={{ color: "#334155" }}>{f.description?.value || "–"}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {polymorphism.length > 0 && (
              <SectionCard title="Polymorphism" icon={Info}>
                {polymorphism.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}
            {toxic.length > 0 && (
              <SectionCard title="Toxic Dose" icon={AlertCircle}>
                {toxic.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}
            {allergen.length > 0 && (
              <SectionCard title="Allergen" icon={Info}>
                {allergen.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}
            {pharmaceutical.length > 0 && (
              <SectionCard title="Pharmaceutical" icon={FlaskConical}>
                {pharmaceutical.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}
          </div>
        )}

        {/* PTM / PROCESSING */}
        {activeTab === "ptm" && (
          <div>
            <SectionCard title="PTM / Processing" icon={Zap}>
              {allPtmFeatures.length > 0
                ? <PTMFeatureTrack features={allPtmFeatures} sequence={sequence} />
                : <p style={{ color: "#94a3b8" }}>No PTM/processing features for this entry.</p>}
            </SectionCard>

            <SectionCard title="PTM Annotations" icon={Info}>
              {ptmComments.length > 0
                ? ptmComments.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14, marginBottom: 12 }}>{c.texts?.[0]?.value}</p>)
                : <p style={{ color: "#94a3b8" }}>No PTM comments available.</p>}
            </SectionCard>

            {activeSites.length > 0 && (
              <SectionCard title="Active & Binding Sites" icon={FlaskConical}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {activeSites.map((f, i) => (
                    <div key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#166534" }}>
                      <strong>{f.type}</strong>
                      {f.location?.start?.value && <span> · Pos {f.location.start.value}</span>}
                      {f.description?.value && <span> · {f.description.value}</span>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {massSpec.length > 0 && (
              <SectionCard title="Mass Spectrometry" icon={Activity}>
                {massSpec.map((c, i) => (
                  <div key={i} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                    {c.molWeight && <span><strong>Mass:</strong> {c.molWeight} Da </span>}
                    {c.method && <span>· {c.method} </span>}
                    {c.note && <span style={{ color: "#64748b" }}>· {c.note}</span>}
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        )}

        {/* INTERACTIONS */}
        {activeTab === "interactions" && (
          <SectionCard title={`Protein Interactions (${interactions.length})`} icon={Users}>
            <InteractionsSection
              interactions={interactions}
              subunits={subunits}
              accession={accession}
            />
          </SectionCard>
        )}

        {/* SEQUENCE */}
        {activeTab === "sequence" && (
          <div>
            <SectionCard title="Amino Acid Sequence" icon={Dna}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                {seqLength && <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 18px", fontSize: 13, color: "#1e40af" }}><strong>Length:</strong> {seqLength} aa</div>}
                {seqMass && <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 18px", fontSize: 13, color: "#1e40af" }}><strong>Mass:</strong> {(seqMass / 1000).toFixed(2)} kDa</div>}
                {seqChecksum && <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 18px", fontSize: 13, color: "#1e40af" }}><strong>CRC64:</strong> {seqChecksum}</div>}
                {d.sequence?.modified && <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 18px", fontSize: 13, color: "#1e40af" }}><strong>Last Modified:</strong> {d.sequence.modified}</div>}
              </div>
              <SequenceViewer 
                sequence={sequence} 
                accession={accession} 
                name={name} 
                gene={genes.join(", ")} 
                organism={organism} 
              />
            </SectionCard>

            {rnaEditing.length > 0 && (
              <SectionCard title="RNA Editing" icon={Info}>
                {rnaEditing.map((c, i) => <p key={i} style={{ color: "#334155", lineHeight: 1.8, fontSize: 14 }}>{c.texts?.[0]?.value}</p>)}
              </SectionCard>
            )}
          </div>
        )}

        {/* PUBLICATIONS */}
        {activeTab === "publications" && (
          <SectionCard title={`Publications (${publications.length})`} icon={BookOpen}>
            {publications.length === 0
              ? <p style={{ color: "#94a3b8" }}>No publications found.</p>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {publications.slice(0, 50).map((pub, i) => {
                    const citation = pub.citation || pub;
                    const title = citation.title || "No title";
                    const authors = citation.authors?.map(a => a.value || a).join(", ") || "";
                    const journal = citation.journal || "";
                    const year = citation.publicationDate || "";
                    const pmid = pub.references?.find(r => r.database === "PubMed")?.id || "";
                    const doi = pub.references?.find(r => r.database === "DOI")?.id || "";
                    const scopes = pub.referencePositions || [];
                    return (
                      <div key={i} style={{ padding: "16px 18px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", borderLeft: "4px solid #2563eb" }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", marginBottom: 6 }}>{title}</p>
                        {authors && <p style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{authors.length > 200 ? authors.slice(0, 200) + "…" : authors}</p>}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: scopes.length ? 8 : 0 }}>
                          {journal && <Badge text={journal} color="#0284c7" />}
                          {year && <Badge text={year} color="#64748b" />}
                          {pmid && <Badge text={`PMID: ${pmid}`} color="#059669" />}
                          {doi && <Badge text={`DOI: ${doi}`} color="#7c3aed" />}
                        </div>
                        {scopes.length > 0 && <div style={{ fontSize: 11, color: "#94a3b8" }}>Scope: {scopes.join(", ")}</div>}
                      </div>
                    );
                  })}
                  {publications.length > 50 && (
                    <p style={{ color: "#64748b", textAlign: "center", fontSize: 13 }}>Showing 50 of {publications.length} publications.</p>
                  )}
                </div>
              )
            }
          </SectionCard>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: "#1e3a8a", color: "#93c5fd", textAlign: "center", padding: "16px 24px", fontSize: 13 }}>
        © {new Date().getFullYear()} Spatial Biologics · Protein Intelligence Platform · All rights reserved
      </div>
    </div>
  );
}