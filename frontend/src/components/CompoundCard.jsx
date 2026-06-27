import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";

export default function CompoundCard({ compound, isBest, index, onStructure, onSummary, onSimilar, onDescription }) {
  const {
    cid, name, formula, weight, image2D,
    has2D, has3D, hasCrystal, synonyms,
    xlogp, hbondDonor, hbondAcceptor, tpsa,
    smiles, inchikey, inchi, exactMass,
    rotatableBonds, description, createDate
  } = compound;

  const { user } = useAuth();
  const { addDownloadedLigand, addLigandFile, setActiveModule, setAdmetSmiles } = useWorkspace();

  const [showMore, setShowMore] = useState(false);
  const [showDownload, setShowDownload] = useState(null);
  const [displayContent, setDisplayContent] = useState(null);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [fileAddedMsg, setFileAddedMsg] = useState({});
  const [admetMsg, setAdmetMsg] = useState("");
  const timerRef = useRef(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const downloadLinks = (type) => [
    {
      label: "SDF",
      save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/SDF?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`,
      display: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/SDF?record_type=${type}&response_type=display`,
      ext: "sdf",
    },
    {
      label: "JSON",
      save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/JSON?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`,
      display: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/JSON?record_type=${type}&response_type=display`,
      ext: "json",
    },
    {
      label: "XML",
      save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/XML?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`,
      display: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/XML?record_type=${type}&response_type=display`,
      ext: "xml",
    },
    {
      label: "ASNT",
      save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/ASNT?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`,
      display: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/ASNT?record_type=${type}&response_type=display`,
      ext: "txt",
    },
  ];

  const requireAuth = () => {
    if (!user) { setShowSignInPopup(true); return false; }
    return true;
  };

  const saveWithPicker = async (content, suggestedName, mimeType, ext) => {
    const blob = new Blob([content], { type: mimeType });
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: "File", accept: { [mimeType]: [`.${ext}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveUrlWithPicker = async (saveUrl, suggestedName, ext) => {
    try {
      const res = await fetch(saveUrl);
      const blob = await res.blob();
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{ description: "File", accept: { "application/octet-stream": [`.${ext}`] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Please try again.");
    }
  };

  const handleSaveAs = async () => {
    setShowSaveOptions(false);
    if (!smiles || smiles === "N/A") return;
    const content = `CID: ${cid}\nName: ${name}\nSMILES: ${smiles}`;
    await saveWithPicker(content, `smiles_CID_${cid}.txt`, "text/plain", "txt");
  };

  const handleAddSmilestoProject = () => {
    if (!requireAuth()) return;
    if (!smiles || smiles === "N/A") return;
    addDownloadedLigand({ cid, smiles, name, formula });
    setSavedMsg("✓ Added!");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const handleSaveToProject = () => {
    setShowSaveOptions(false);
    if (!requireAuth()) return;
    if (!smiles || smiles === "N/A") return;
    addDownloadedLigand({ cid, smiles, name, formula });
    setSavedMsg("✓ Saved!");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const handleFileSaveAs = async (saveUrl, label, type, ext) => {
    const suggestedName = `Structure_${type}_CID_${cid}.${ext}`;
    await saveUrlWithPicker(saveUrl, suggestedName, ext);
  };

  const handleFileAddToProject = (label, type, saveUrl, ext) => {
    if (!requireAuth()) return;
    const fileKey = `${cid}_${label}_${type}`;
    addLigandFile({
      key: fileKey,
      cid,
      name: name || `CID ${cid}`,
      label,
      type,
      saveUrl,
      ext,
      fileName: `Structure_${type}_CID_${cid}.${ext}`,
    });
    setFileAddedMsg(prev => ({ ...prev, [fileKey]: "✓" }));
    setTimeout(() => setFileAddedMsg(prev => {
      const n = { ...prev };
      delete n[fileKey];
      return n;
    }), 2000);
  };

  const handleAddToAdmet = () => {
    if (!requireAuth()) return;
    if (!smiles || smiles === "N/A") return;
    const needsRepair =
      smiles.includes(".") ||
      smiles.includes("@") ||
      /\[[A-Z][a-z]?\d*[+-]/.test(smiles);
    setAdmetSmiles({ smiles, needsRepair });
    setActiveModule("deeppk");
    setAdmetMsg("✓ Sent!");
    setTimeout(() => setAdmetMsg(""), 2000);
  };

  return (
    <div className={`compound-card ${isBest ? "best-card" : ""}`}>
      {index && <div className="card-index">{index} of results</div>}

      {/* ── Sign-in popup — no buttons, animated, stays until user clicks Cancel ── */}
      {showSignInPopup && (
        <>
          <style>{`
            @keyframes ccFadeIn {
              from { opacity: 0; transform: scale(0.88) translateY(16px); }
              to   { opacity: 1; transform: scale(1)    translateY(0);    }
            }
            @keyframes ccPulseRing {
              0%   { box-shadow: 0 0 0 0   rgba(37,99,235,0.45); }
              70%  { box-shadow: 0 0 0 14px rgba(37,99,235,0);   }
              100% { box-shadow: 0 0 0 0   rgba(37,99,235,0);    }
            }
            @keyframes ccDot {
              0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
              40%           { transform: scale(1.1); opacity: 1;   }
            }
            @keyframes ccSweep {
              0%   { width: 0%;   }
              100% { width: 100%; }
            }
            @keyframes ccFloat {
              0%, 100% { transform: translateY(0px);  }
              50%       { transform: translateY(-6px); }
            }
          `}</style>

          {/* Backdrop */}
          <div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(15,23,42,0.55)",
              zIndex: 1000,
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {/* Card */}
            <div style={{
              background: "#fff",
              borderRadius: 20,
              padding: "40px 44px 32px",
              maxWidth: 360,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
              animation: "ccFadeIn 0.32s cubic-bezier(.34,1.56,.64,1)",
              border: "1.5px solid #e0e7ff",
              position: "relative",
              overflow: "hidden",
            }}>

              {/* Sweep progress bar at top — runs forever until dismissed */}
              <div style={{
                position: "absolute", top: 0, left: 0,
                height: 3,
                background: "linear-gradient(90deg,#6366f1,#2563eb,#38bdf8)",
                animation: "ccSweep 2.4s ease-in-out infinite",
                borderRadius: "20px 20px 0 0",
              }} />

              {/* Floating animated lock */}
              <div style={{
                width: 72, height: 72,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                animation: "ccPulseRing 1.8s ease-out infinite, ccFloat 3s ease-in-out infinite",
                border: "2px solid #bfdbfe",
              }}>
                <span style={{ fontSize: 32 }}>🔒</span>
              </div>

              <h3 style={{
                fontWeight: 700, fontSize: 18,
                color: "#1e293b", margin: "0 0 10px",
                letterSpacing: "-0.01em",
              }}>
                Sign In Required
              </h3>

              <p style={{
                color: "#64748b", fontSize: 14,
                lineHeight: 1.7, margin: "0 0 28px",
              }}>
                To access this function you must<br />sign in to your account.
              </p>

              {/* Bouncing dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: 10, height: 10,
                    borderRadius: "50%",
                    background: i % 2 === 0 ? "#2563eb" : "#6366f1",
                    animation: `ccDot 1.4s ease-in-out ${i * 0.18}s infinite`,
                  }} />
                ))}
              </div>

              <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 24px" }}>
                Please sign in to continue…
              </p>

              {/* Single dismiss link — no button style, just subtle text */}
              <button
                onClick={() => setShowSignInPopup(false)}
                style={{
                  background: "none", border: "none",
                  color: "#94a3b8", fontSize: 12,
                  cursor: "pointer", textDecoration: "underline",
                  padding: 0,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      <div className="card-top-row">
        <div className="card-img-wrap" onContextMenu={e => e.preventDefault()}>
          <img src={image2D} alt={name} draggable="false" onContextMenu={e => e.preventDefault()} />
        </div>

        <div className="card-top-info">
          {synonyms?.length > 0 && (
            <div className="synonym-line">{synonyms.join("; ")}</div>
          )}

          <table className="info-table">
            <tbody>
              <tr><td className="info-key">Compound CID</td><td className="info-val cid-val">{cid}</td></tr>
              <tr><td className="info-key">MF</td><td className="info-val formula-val">{formula}</td></tr>
              <tr><td className="info-key">MW</td><td className="info-val">{weight} g/mol</td></tr>
              <tr><td className="info-key">IUPAC Name</td><td className="info-val">{name}</td></tr>

              <tr>
                <td className="info-key">SMILES</td>
                <td className="info-val smiles-val">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                      {smiles && smiles !== "N/A" ? smiles : "—"}
                    </span>
                    {smiles && smiles !== "N/A" && (
                      <>
                        <button
                          onClick={handleAddSmilestoProject}
                          style={{
                            background: savedMsg ? "#16a34a" : "#15803d",
                            color: "#fff", border: "none", borderRadius: 6,
                            padding: "3px 11px", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          {savedMsg || "+ Add to Project"}
                        </button>

                        <button
                          onClick={handleAddToAdmet}
                          title={
                            smiles.includes(".") || smiles.includes("@") || /\[[A-Z][a-z]?\d*[+-]/.test(smiles)
                              ? "Complex SMILES — will open in Repair tool"
                              : "Send directly to ADMET search bar"
                          }
                          style={{
                            background: admetMsg
                              ? "#16a34a"
                              : smiles.includes(".") || smiles.includes("@") || /\[[A-Z][a-z]?\d*[+-]/.test(smiles)
                                ? "#d97706"
                                : "#6c3fc5",
                            color: "#fff", border: "none", borderRadius: 6,
                            padding: "3px 11px", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                        >
                          {admetMsg
                            ? admetMsg
                            : smiles.includes(".") || smiles.includes("@") || /\[[A-Z][a-z]?\d*[+-]/.test(smiles)
                              ? "🔧 Add to ADMET (Repair)"
                              : "⚗ Add to ADMET"
                          }
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>

              <tr><td className="info-key">InChIKey</td><td className="info-val inchi-val">{inchikey}</td></tr>
              {inchi && <tr><td className="info-key">InChI</td><td className="info-val inchi-val">{inchi}</td></tr>}
              {createDate && <tr><td className="info-key">Create Date</td><td className="info-val">{createDate}</td></tr>}
            </tbody>
          </table>

          {description && (
            <div className="card-description">
              <div className="desc-text" style={{ maxHeight: showMore ? "none" : "3.5rem", overflow: "hidden", position: "relative" }}>
                {description}
                {!showMore && <div className="desc-fade" />}
              </div>
              <button className="btn-viewmore" onClick={() => setShowMore(!showMore)}>
                {showMore ? "View Less" : "View More..."}
              </button>
            </div>
          )}

          {showMore && (
            <table className="info-table" style={{ marginTop: "0.5rem" }}>
              <tbody>
                <tr><td className="info-key">XLogP</td><td className="info-val">{xlogp}</td></tr>
                <tr><td className="info-key">H-Bond Donor</td><td className="info-val">{hbondDonor}</td></tr>
                <tr><td className="info-key">H-Bond Acceptor</td><td className="info-val">{hbondAcceptor}</td></tr>
                <tr><td className="info-key">Rotatable Bonds</td><td className="info-val">{rotatableBonds}</td></tr>
                <tr><td className="info-key">Exact Mass</td><td className="info-val">{exactMass}</td></tr>
                <tr><td className="info-key">TPSA</td><td className="info-val">{tpsa} Å²</td></tr>
              </tbody>
            </table>
          )}

          <div className="card-links">
            <button className="link-btn" onClick={onSummary}>Summary</button>
            <span className="link-sep">|</span>
            <button className="link-btn" onClick={onDescription}>Description</button>
            <span className="link-sep">|</span>
            <button className="link-btn" onClick={onSimilar}>Similar Structures</button>
            <span className="link-sep">|</span>
            <button className="link-btn" onClick={() => setShowMore(!showMore)}>Related Records</button>
          </div>

          <div className="struct-row">
            <span className="struct-label">View Structure:</span>
            {has2D && <button className="btn-struct" onClick={() => onStructure("2d")}>2D</button>}
            {has3D && <button className="btn-struct" onClick={() => onStructure("3d")}>3D</button>}
            {hasCrystal && <button className="btn-struct" onClick={() => onStructure("crystal")}>Crystal</button>}
          </div>

          <div className="download-section" style={{ position: "relative", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span className="struct-label">Download:</span>
            <button
              className={`btn-struct ${showDownload === "2d" ? "active" : ""}`}
              onClick={() => { setShowDownload(showDownload === "2d" ? null : "2d"); setDisplayContent(null); }}
            >2D</button>
            <button
              className={`btn-struct ${showDownload === "3d" ? "active" : ""}`}
              onClick={() => { setShowDownload(showDownload === "3d" ? null : "3d"); setDisplayContent(null); }}
            >3D</button>

            <div style={{ display: "inline-block", position: "relative", marginLeft: 4 }}>
              <button
                onClick={() => setShowSaveOptions(o => !o)}
                style={{
                  background: savedMsg ? "#16a34a" : "#86efac",
                  color: savedMsg ? "#fff" : "#14532d",
                  border: "none", borderRadius: 6,
                  padding: "4px 14px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {savedMsg || "Save ▾"}
              </button>
              {showSaveOptions && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowSaveOptions(false)} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
                    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                    boxShadow: "0 6px 24px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "8px 14px 6px", fontSize: 10, fontWeight: 700,
                      color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em",
                      borderBottom: "1px solid #f1f5f9",
                    }}>Save SMILES</div>
                    <button
                      onClick={handleSaveAs}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "10px 14px", background: "none", border: "none",
                        cursor: "pointer", fontSize: 13, color: "#1e293b", fontWeight: 500,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <span style={{ marginRight: 8 }}>💾</span> Save As (choose location)
                    </button>
                    <button
                      onClick={handleSaveToProject}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "10px 14px", background: "none", border: "none",
                        cursor: "pointer", fontSize: 13, color: "#1e293b", fontWeight: 500,
                        borderTop: "1px solid #f1f5f9",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <span style={{ marginRight: 8 }}>📌</span> Add to Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {showDownload && (
            <div className="download-table">
              {downloadLinks(showDownload).map(dl => {
                const fileKey = `${cid}_${dl.label}_${showDownload}`;
                const added = fileAddedMsg[fileKey];
                return (
                  <div key={dl.label} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap",
                  }}>
                    <span style={{ minWidth: 40, fontWeight: 600, fontSize: 12, color: "#374151" }}>
                      {dl.label}
                    </span>
                    <button
                      className="download-btn"
                      style={{ fontSize: 11 }}
                      onClick={() => handleFileSaveAs(dl.save, dl.label, showDownload, dl.ext)}
                    >
                      💾 Save As
                    </button>
                    <button
                      className="download-btn"
                      style={{ fontSize: 11 }}
                      onClick={() => setDisplayContent({ url: dl.display, label: dl.label })}
                    >
                      👁 Display
                    </button>
                    <button
                      onClick={() => handleFileAddToProject(dl.label, showDownload, dl.save, dl.ext)}
                      style={{
                        background: added ? "#16a34a" : "#ec4899",
                        color: "#fff", border: "none", borderRadius: 5,
                        padding: "3px 9px", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {added ? "✓ Added" : "📌 Add to Project"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {displayContent && (
            <div className="display-viewer">
              <div className="display-viewer-head">
                <span>{displayContent.label} Data — CID {cid}</span>
                <button onClick={() => setDisplayContent(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>✕</button>
              </div>
              <iframe
                src={displayContent.url}
                title="Display content"
                width="100%"
                height="300px"
                style={{ border: "none", display: "block", background: "#fff" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}