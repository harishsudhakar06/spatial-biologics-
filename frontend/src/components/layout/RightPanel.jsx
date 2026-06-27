import React, { useState, useEffect, useRef } from "react";
import { Dna, FlaskConical, Clock, ChevronDown, ChevronUp, Minus, FileText, Menu, Folder, Search, Eye, Trash2, Plus, Download, FolderPlus, ChevronLeft, ChevronRight, BarChart2, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-slide-in">
        <h4 className="text-base font-semibold text-slate-950 mb-2">Remove item?</h4>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer focus:outline-none"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer focus:outline-none"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, items, emptyMsg, renderItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-slate-100 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-all duration-150 focus:outline-none"
      >
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <Icon size={13} className="text-slate-400" />
          {title}
        </div>
        <div className="text-slate-400">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50/30 border border-dashed border-slate-200/60 rounded-xl">{emptyMsg}</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, i) => renderItem(item, i))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SmilesDetailPage({ item, onBack }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#fff",
      zIndex: 500, overflowY: "auto", padding: "32px 40px",
      fontFamily: "Inter, sans-serif",
    }}>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#f1f5f9", border: "1px solid #e2e8f0",
        borderRadius: 8, padding: "8px 18px", fontSize: 14,
        fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 28,
      }}>← Back</button>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
        {item.name || "CID " + item.cid}
      </h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>CID: {item.cid}</p>
      <div style={{
        background: "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 10, padding: "20px 24px", maxWidth: 680,
      }}>
        <div style={{ marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Molecular Formula
          </span>
          <div style={{ fontSize: 14, color: "#1e293b", marginTop: 2 }}>{item.formula || "—"}</div>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            SMILES
          </span>
          <div style={{
            marginTop: 6, background: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 7, padding: "10px 14px",
            fontFamily: "Courier New, monospace", fontSize: 13,
            color: "#0f172a", wordBreak: "break-all", lineHeight: 1.7,
          }}>
            {item.smiles || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileDetailPage({ item, onBack }) {
  const handleDownload = async () => {
    try {
      const res = await fetch(item.saveUrl);
      const blob = await res.blob();
      const ext = item.ext || item.label.toLowerCase();
      const suggestedName = item.fileName || `Structure_${item.type}_CID_${item.cid}.${ext}`;
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

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#fff",
      zIndex: 500, overflowY: "auto", padding: "32px 40px",
      fontFamily: "Inter, sans-serif",
    }}>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#f1f5f9", border: "1px solid #e2e8f0",
        borderRadius: 8, padding: "8px 18px", fontSize: 14,
        fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 28,
      }}>← Back</button>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
        {item.name || "CID " + item.cid}
      </h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 28 }}>CID: {item.cid}</p>
      <div style={{
        background: "#fdf2f8", border: "1px solid #fbcfe8",
        borderRadius: 10, padding: "20px 24px", maxWidth: 480,
      }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Format
          </span>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              background: "#ec4899", color: "#fff",
              fontSize: 12, fontWeight: 700, padding: "3px 10px",
              borderRadius: 5, textTransform: "uppercase",
            }}>{item.label}</span>
            <span style={{
              background: "#f3f4f6", color: "#6b7280",
              fontSize: 11, fontWeight: 600, padding: "3px 8px",
              borderRadius: 4, textTransform: "uppercase",
            }}>{item.type === "2d" ? "2D" : "3D"}</span>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            File Name
          </span>
          <div style={{ marginTop: 4, fontFamily: "Courier New, monospace", fontSize: 13, color: "#1e293b" }}>
            {item.fileName}
          </div>
        </div>
        <button onClick={handleDownload} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#ec4899", color: "#fff", border: "none",
          borderRadius: 8, padding: "10px 22px", fontSize: 14,
          fontWeight: 700, cursor: "pointer",
        }}>
          💾 Download File
        </button>
      </div>
    </div>
  );
}

function ProteinDetailPage({ item, onBack }) {
  const [content, setContent] = useState(item.content || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadContent = async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (item.format === "pdb") {
        res = await fetch(`/api/pdb/fasta/${item.accession}`);
      } else {
        const fmt = item.format === "fasta" ? "fasta" : "txt";
        res = await fetch(`/api/proteins/download?accessions=${item.accession}&format=${fmt}`);
      }
      if (!res.ok) throw new Error("Failed");
      const text = await res.text();
      setContent(text);
    } catch {
      setError("Failed to load content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#fff",
      zIndex: 500, overflowY: "auto", padding: "32px 40px",
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .detail-dot {
          display: inline-block; width: 8px; height: 8px;
          border-radius: 50%; background: #2563eb;
          animation: dotBounce 1.2s ease-in-out infinite;
        }
        .detail-dot:nth-child(2) { animation-delay: 0.18s; }
        .detail-dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes contentFade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        .content-fade { animation: contentFade 0.35s ease forwards; }
      `}</style>

      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#f1f5f9", border: "1px solid #e2e8f0",
        borderRadius: 8, padding: "8px 18px", fontSize: 14,
        fontWeight: 600, color: "#334155", cursor: "pointer", marginBottom: 28,
      }}>← Back</button>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
        {item.accession}
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {item.entryName && <span style={{ fontSize: 13, color: "#64748b" }}>{item.entryName}</span>}
        {item.gene && <span style={{ fontSize: 13, color: "#94a3b8" }}>· Gene: {item.gene}</span>}
        {item.organism && <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>· {item.organism}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <span style={{
          background: item.format === "fasta" ? "#dbeafe" : item.format === "pdb" ? "#fee2e2" : "#f0fdf4",
          color: item.format === "fasta" ? "#1d4ed8" : item.format === "pdb" ? "#991b1b" : "#15803d",
          fontSize: 11, fontWeight: 700, padding: "2px 8px",
          borderRadius: 4, textTransform: "uppercase",
        }}>
          {item.format === "fasta" ? "FASTA" : item.format === "pdb" ? "PDB" : "Text"}
        </span>
      </div>

      {!content && !loading && (
        <button onClick={loadContent} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#2563eb", color: "#fff", border: "none",
          borderRadius: 8, padding: "10px 22px", fontSize: 14,
          fontWeight: 700, cursor: "pointer", marginBottom: 24,
          transition: "background 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background = "#2563eb"}
        >
          Load Content
        </button>
      )}

      {loading && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 24 }}>
          <span style={{ color: "#64748b", fontSize: 14 }}>Fetching from Protein Library</span>
          <span style={{ display: "flex", gap: 5 }}>
            <span className="detail-dot" />
            <span className="detail-dot" />
            <span className="detail-dot" />
          </span>
        </div>
      )}

      {error && (
        <div style={{
          color: "#dc2626", fontSize: 13, marginBottom: 16,
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 8, padding: "10px 16px",
        }}>
          {error}
          <button onClick={loadContent} style={{
            marginLeft: 12, color: "#2563eb", background: "none",
            border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}>Retry</button>
        </div>
      )}

      {content && (
        <div className="content-fade" style={{
          background: "#f5f5f5", fontFamily: "Courier New, Courier, monospace",
          fontSize: 13, color: "#111", padding: "20px", borderRadius: 8,
          maxWidth: 900, overflowX: "auto", whiteSpace: "pre",
          lineHeight: 1.7, border: "1px solid #e2e8f0",
        }}>
          {content}
        </div>
      )}
    </div>
  );
}

export default function RightPanel() {
  const { user, logout } = useAuth();
  const {
    downloadedLigands, removeDownloadedLigand,
    ligandFiles, removeLigandFile,
    downloadedProteins, removeDownloadedProtein,
    dockingJobs, setActiveModule,
    activeProjectId, changeActiveProject,
    projects, createNewProject, mergeProjectIntoActive, addItemsToProject,
  } = useWorkspace();

  const [checkedSMILES, setCheckedSMILES] = useState({});
  const [checkedFiles, setCheckedFiles] = useState({});
  const [checkedProteins, setCheckedProteins] = useState({});
  const [checkedJobs, setCheckedJobs] = useState({});
  const [collapsed, setCollapsed] = useState(true);

  const totalItems = 
    (downloadedLigands || []).length +
    (ligandFiles || []).length +
    (downloadedProteins || []).length +
    (dockingJobs || []).length;

  const prevTotalRef = useRef(totalItems);

  useEffect(() => {
    if (totalItems > 0 && prevTotalRef.current === 0) {
      setCollapsed(false);
    } else if (totalItems === 0) {
      setCollapsed(true);
    }
    prevTotalRef.current = totalItems;
  }, [totalItems]);

  const numChecked = 
    Object.values(checkedSMILES).filter(Boolean).length +
    Object.values(checkedFiles).filter(Boolean).length +
    Object.values(checkedProteins).filter(Boolean).length +
    Object.values(checkedJobs).filter(Boolean).length;

  const handleAddToProject = (targetProjId) => {
    if (!targetProjId) return;
    
    const smilesToCopy = (downloadedLigands || []).filter(l => checkedSMILES[l.cid]);
    const filesToCopy = (ligandFiles || []).filter(f => checkedFiles[f.key]);
    const proteinsToCopy = (downloadedProteins || []).filter(p => checkedProteins[`${p.accession}_${p.format}`]);
    const jobsToCopy = (dockingJobs || []).filter(j => checkedJobs[j.name]);

    addItemsToProject(targetProjId, {
      smiles: smilesToCopy,
      files: filesToCopy,
      proteins: proteinsToCopy,
      jobs: jobsToCopy
    });

    // Clear selection
    setCheckedSMILES({});
    setCheckedFiles({});
    setCheckedProteins({});
    setCheckedJobs({});
  };

  const downloadCSV = async (title, headers, rows) => {
    let handle;
    const suggestedName = `${title.replace(/\s+/g, '_')}_details.csv`;

    const csvHeader = headers.join(",") + "\n";
    const csvRows = rows.map(row => 
      row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")
    );
    
    const csvContent = csvHeader + csvRows.join("\n");
    const mimeType = "text/csv";
    const blob = new Blob([csvContent], { type: mimeType });

    if (window.showSaveFilePicker) {
      try {
        handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: "CSV File",
            accept: { [mimeType]: [".csv"] },
          }],
        });
      } catch (e) {
        if (e.name === "AbortError") return;
        console.error("Save file picker failed:", e);
      }
    }

    if (handle) {
      try {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        console.error("Writing to handle failed:", e);
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", suggestedName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const headers = ["Project", "Category", "ID/Name", "Property 1", "Property 2"];
    const rows = [];
    
    Object.keys(projects || {}).forEach(projId => {
      const proj = projects[projId] || {};
      
      (proj.downloadedLigands || []).forEach(l => {
        rows.push([
          projId,
          "SMILES",
          `CID ${l.cid}`,
          l.formula ? `Formula: ${l.formula}` : "",
          l.smiles || ""
        ]);
      });

      (proj.ligandFiles || []).forEach(f => {
        rows.push([
          projId,
          "File",
          `CID ${f.cid}`,
          `Label: ${f.label} (${f.type?.toUpperCase()})`,
          `File Name: ${f.fileName}`
        ]);
      });

      (proj.downloadedProteins || []).forEach(p => {
        rows.push([
          projId,
          "Saved Protein",
          p.accession,
          `Format: ${p.format?.toUpperCase()}`,
          p.gene ? `Gene: ${p.gene}` : ""
        ]);
      });

      (proj.dockingJobs || []).forEach(j => {
        rows.push([
          projId,
          "Docking Job",
          j.name,
          `Status: ${j.status}`,
          ""
        ]);
      });
    });

    downloadCSV("All_Projects", headers, rows);
  };

  const handleExportSelected = () => {
    const headers = ["Project", "Category", "ID/Name", "Property 1", "Property 2"];
    const rows = [];
    const projId = activeProjectId;

    (downloadedLigands || []).forEach(l => {
      if (checkedSMILES[l.cid]) {
        rows.push([
          projId,
          "SMILES",
          `CID ${l.cid}`,
          l.formula ? `Formula: ${l.formula}` : "",
          l.smiles || ""
        ]);
      }
    });

    (ligandFiles || []).forEach(f => {
      if (checkedFiles[f.key]) {
        rows.push([
          projId,
          "File",
          `CID ${f.cid}`,
          `Label: ${f.label} (${f.type?.toUpperCase()})`,
          `File Name: ${f.fileName}`
        ]);
      }
    });

    (downloadedProteins || []).forEach(p => {
      const key = `${p.accession}_${p.format}`;
      if (checkedProteins[key]) {
        rows.push([
          projId,
          "Saved Protein",
          p.accession,
          `Format: ${p.format?.toUpperCase()}`,
          p.gene ? `Gene: ${p.gene}` : ""
        ]);
      }
    });

    (dockingJobs || []).forEach(j => {
      if (checkedJobs[j.name]) {
        rows.push([
          projId,
          "Docking Job",
          j.name,
          `Status: ${j.status}`,
          ""
        ]);
      }
    });

    downloadCSV(`${projId}_selected`, headers, rows);
  };

  const [viewSmiles, setViewSmiles] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const [viewProtein, setViewProtein] = useState(null);

  // Confirmation dialog state
  const [confirm, setConfirm] = useState(null);
  // confirm = { message: "...", onConfirm: fn }

  const askConfirm = (message, onConfirm) => {
    setConfirm({ message, onConfirm });
  };

  const handleConfirm = () => {
    confirm?.onConfirm();
    setConfirm(null);
  };

  if (viewSmiles) return <SmilesDetailPage item={viewSmiles} onBack={() => setViewSmiles(null)} />;
  if (viewFile) return <FileDetailPage item={viewFile} onBack={() => setViewFile(null)} />;
  if (viewProtein) return <ProteinDetailPage item={viewProtein} onBack={() => setViewProtein(null)} />;

  if (!user) {
    return (
      <aside 
        className="flex-shrink-0 border-l border-slate-200 bg-white h-full overflow-y-auto flex flex-col z-45"
        style={{
          width: collapsed ? 72 : 260,
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {collapsed ? (
          <div className="py-4 flex flex-col items-center gap-4">
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-450 hover:text-slate-650 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer focus:outline-none"
              title="Expand Project Panel"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setActiveModule("login")}
              className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 hover:bg-blue-100 transition-all cursor-pointer focus:outline-none"
              title="Sign In"
            >
              🔒
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-150 flex items-center justify-between">
              <div className="flex-grow min-w-0 pr-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Account</span>
                <button
                  onClick={() => setActiveModule("login")}
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold py-2 rounded-xl transition-all shadow-sm cursor-pointer focus:outline-none"
                >
                  Sign In
                </button>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer focus:outline-none self-start"
                title="Collapse Panel"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projects</span>
              <div className="space-y-3 mt-3">
                <div className="text-xs text-slate-400 cursor-not-allowed flex items-center gap-2"><FlaskConical size={13} /> Saved Ligands</div>
                <div className="text-xs text-slate-400 cursor-not-allowed flex items-center gap-2"><Dna size={13} /> Saved Proteins</div>
                <div className="text-xs text-slate-400 cursor-not-allowed flex items-center gap-2"><Clock size={13} /> Docking Jobs</div>
                <div className="text-xs text-slate-400 cursor-not-allowed flex items-center gap-2"><BarChart2 size={13} /> Analytics</div>
              </div>
            </div>
          </>
        )}
      </aside>
    );
  }

  if (collapsed && user) {
    return (
      <aside 
        className="flex-shrink-0 border-l border-slate-200 bg-white h-full overflow-y-auto flex flex-col items-center py-4"
        style={{
          width: 72,
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-450 hover:text-slate-650 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer mb-5 focus:outline-none"
          title="Expand Project Panel"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 flex flex-col gap-6 items-center w-full">
          <div className="relative group cursor-pointer" title={`User: ${user.username || user.email}`} onClick={() => setCollapsed(false)}>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200">
              {(user.username || user.name || user.email || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {user.username || user.email}
            </div>
          </div>

          <div className="relative group cursor-pointer flex flex-col items-center" title={`Active Project: ${activeProjectId}`} onClick={() => setCollapsed(false)}>
            <Folder size={18} className="text-blue-600" />
            <div className="text-[9px] font-bold text-blue-700 mt-1 max-w-[40px] truncate text-center">
              {activeProjectId}
            </div>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Project: {activeProjectId}
            </div>
          </div>

          <div className="w-8 border-b border-gray-100 my-1" />

          <div className="relative group cursor-pointer flex flex-col items-center" onClick={() => setCollapsed(false)}>
            <FlaskConical size={18} className="text-gray-600" />
            <span className="absolute -top-1.5 -right-1.5 bg-gray-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
              {(downloadedLigands || []).length}
            </span>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {(downloadedLigands || []).length} SMILES
            </div>
          </div>

          <div className="relative group cursor-pointer flex flex-col items-center" onClick={() => setCollapsed(false)}>
            <FileText size={18} className="text-pink-500" />
            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
              {(ligandFiles || []).length}
            </span>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {(ligandFiles || []).length} Files
            </div>
          </div>

          <div className="relative group cursor-pointer flex flex-col items-center" onClick={() => setCollapsed(false)}>
            <Dna size={18} className="text-blue-500" />
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
              {(downloadedProteins || []).length}
            </span>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {(downloadedProteins || []).length} Proteins
            </div>
          </div>

          <div className="relative group cursor-pointer flex flex-col items-center" onClick={() => setCollapsed(false)}>
            <Clock size={18} className="text-yellow-600" />
            <span className="absolute -top-1.5 -right-1.5 bg-yellow-600 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
              {(dockingJobs || []).length}
            </span>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {(dockingJobs || []).length} Docking Jobs
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const actionBtns = (onView, onRemove) => (
    <div className="flex gap-1.5 flex-shrink-0">
      <button
        onClick={onView}
        title="View details"
        className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-all cursor-pointer border border-transparent focus:outline-none"
      >
        <Eye size={12} />
      </button>
      <button
        onClick={onRemove}
        title="Remove"
        className="w-6 h-6 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all cursor-pointer border border-transparent focus:outline-none"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <aside 
        className="flex-shrink-0 border-l border-slate-200 bg-white h-full overflow-y-auto z-45"
        style={{
          width: collapsed ? 72 : 260,
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >

        <div className="p-4 border-b border-slate-150 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Profile</span>
            <div className="text-sm font-semibold text-slate-800 truncate mt-0.5">
              {user.username || user.name || user.email}
            </div>
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
            <button
              onClick={() => { logout(); setActiveModule("landing"); }}
              className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm cursor-pointer border-none focus:outline-none"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer focus:outline-none"
            title="Collapse Panel"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-150 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Project</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportAll}
                title="Export All to Excel/CSV"
                className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-all cursor-pointer border border-transparent focus:outline-none"
              >
                <Download size={12} />
              </button>
              <button
                onClick={createNewProject}
                title="Create New Project"
                className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-all cursor-pointer border border-transparent focus:outline-none"
              >
                <FolderPlus size={12} />
              </button>
            </div>
          </div>
          <div className="relative">
            <select
              value={activeProjectId}
              onChange={(e) => changeActiveProject(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 w-full appearance-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100/50 cursor-pointer shadow-sm"
            >
              {Object.keys(projects || {}).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown size={12} />
            </div>
          </div>
        </div>

        {numChecked > 0 && (
          <div className="px-3 py-2 border-b border-gray-200 bg-blue-50 flex flex-col gap-1.5">
            <span className="text-[10px] text-blue-700 font-bold uppercase">{numChecked} items checked</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">Add to project:</span>
              <select
                value=""
                onChange={(e) => handleAddToProject(e.target.value)}
                className="text-[10px] font-bold text-blue-700 bg-transparent border-0 outline-none cursor-pointer truncate max-w-[85px]"
              >
                <option value="">Select...</option>
                {Object.keys(projects || {})
                  .filter(id => id !== activeProjectId)
                  .map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))
                }
              </select>
            </div>
            <button
              onClick={handleExportSelected}
              className="w-full text-center bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1 rounded transition-colors"
            >
              Export Checked to Excel (CSV)
            </button>
          </div>
        )}

        {/* SMILES */}
        <Section
          title="SMILES"
          icon={FlaskConical}
          items={downloadedLigands || []}
          emptyMsg="No SMILES saved yet"
          renderItem={(item, i) => (
            <div key={i} className="flex items-start justify-between gap-1 py-1 border-b border-gray-50 last:border-0">
              <div className="flex items-start gap-1 min-w-0">
                <input
                  type="checkbox"
                  checked={!!checkedSMILES[item.cid]}
                  onChange={() => setCheckedSMILES(prev => ({ ...prev, [item.cid]: !prev[item.cid] }))}
                  className="mt-1 mr-1 flex-shrink-0 cursor-pointer"
                />
                <div className="text-xs text-gray-600 min-w-0">
                  <div className="font-medium truncate text-blue-600">CID {item.cid}</div>
                  <div className="text-gray-400 truncate" style={{ fontFamily: "monospace", fontSize: 10 }}>
                    {item.smiles ? item.smiles.slice(0, 20) + (item.smiles.length > 20 ? "…" : "") : "—"}
                  </div>
                </div>
              </div>
              {actionBtns(
                () => setViewSmiles(item),
                () => askConfirm(
                  `Remove CID ${item.cid} from Saved SMILES?`,
                  () => removeDownloadedLigand(item.cid)
                ),
                "#0ea5e9"
              )}
            </div>
          )}
        />

        {/* FILES */}
        <Section
          title="Files"
          icon={FileText}
          iconColor="#ec4899"
          items={ligandFiles || []}
          emptyMsg="No files saved yet"
          renderItem={(item, i) => (
            <div key={i} className="flex items-start justify-between gap-1 py-1 border-b border-gray-50 last:border-0">
              <div className="flex items-start gap-1 min-w-0">
                <input
                  type="checkbox"
                  checked={!!checkedFiles[item.key]}
                  onChange={() => setCheckedFiles(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className="mt-1 mr-1 flex-shrink-0 cursor-pointer"
                />
                <div className="text-xs min-w-0">
                  <div className="font-medium truncate" style={{ color: "#ec4899" }}>CID {item.cid}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{
                      background: "#fdf2f8", color: "#ec4899",
                      fontSize: 9, fontWeight: 700, padding: "1px 5px",
                      borderRadius: 3, textTransform: "uppercase",
                    }}>{item.label}</span>
                    <span style={{
                      background: "#f3f4f6", color: "#6b7280",
                      fontSize: 9, fontWeight: 600, padding: "1px 4px",
                      borderRadius: 3, textTransform: "uppercase",
                    }}>{item.type === "2d" ? "2D" : "3D"}</span>
                  </div>
                </div>
              </div>
              {actionBtns(
                () => setViewFile(item),
                () => askConfirm(
                  `Remove CID ${item.cid} (${item.label} ${item.type?.toUpperCase()}) from Files?`,
                  () => removeLigandFile(item.key)
                ),
                "#ec4899"
              )}
            </div>
          )}
        />

        {/* PROTEIN SEARCH (PDB STRUCTURES) */}
        <Section
          title="Protein Search"
          icon={Search}
          items={(downloadedProteins || []).filter(p => p.format === "pdb")}
          emptyMsg="No protein structures saved"
          renderItem={(item, i) => {
            const key = `${item.accession}_${item.format}`;
            return (
              <div key={i} className="flex items-start justify-between gap-1 py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-start gap-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={!!checkedProteins[key]}
                    onChange={() => setCheckedProteins(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="mt-1 mr-1 flex-shrink-0 cursor-pointer"
                  />
                  <div className="text-xs text-gray-600 min-w-0">
                    <div className="font-medium truncate text-blue-600">{item.accession}</div>
                    <span style={{
                      display: "inline-block",
                      background: "#fef3c7",
                      color: "#b45309",
                      fontSize: 9, fontWeight: 700, padding: "1px 5px",
                      borderRadius: 3, textTransform: "uppercase", marginTop: 2,
                    }}>
                      PDB
                    </span>
                  </div>
                </div>
                {actionBtns(
                  () => setViewProtein(item),
                  () => askConfirm(
                    `Remove ${item.accession} (PDB) from Protein Search?`,
                    () => removeDownloadedProtein(key)
                  ),
                  "#0ea5e9"
                )}
              </div>
            );
          }}
        />

        {/* PROTEIN LIBRARY (UNIPROT SEQUENCES) */}
        <Section
          title="Protein Library"
          icon={Dna}
          items={(downloadedProteins || []).filter(p => p.format !== "pdb")}
          emptyMsg="No library proteins saved"
          renderItem={(item, i) => {
            const key = `${item.accession}_${item.format}`;
            return (
              <div key={i} className="flex items-start justify-between gap-1 py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-start gap-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={!!checkedProteins[key]}
                    onChange={() => setCheckedProteins(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="mt-1 mr-1 flex-shrink-0 cursor-pointer"
                  />
                  <div className="text-xs text-gray-600 min-w-0">
                    <div className="font-medium truncate text-blue-600">{item.accession}</div>
                    <span style={{
                      display: "inline-block",
                      background: item.format === "fasta" ? "#dbeafe" : "#f0fdf4",
                      color: item.format === "fasta" ? "#1d4ed8" : "#15803d",
                      fontSize: 9, fontWeight: 700, padding: "1px 5px",
                      borderRadius: 3, textTransform: "uppercase", marginTop: 2,
                    }}>
                      {item.format === "fasta" ? "FASTA" : "Text"}
                    </span>
                  </div>
                </div>
                {actionBtns(
                  () => setViewProtein(item),
                  () => askConfirm(
                    `Remove ${item.accession} (${item.format?.toUpperCase()}) from Protein Library?`,
                    () => removeDownloadedProtein(key)
                  ),
                  "#0ea5e9"
                )}
              </div>
            );
          }}
        />

        {/* DOCKING JOBS */}
        <Section
          title="Docking Jobs"
          icon={Clock}
          items={dockingJobs || []}
          emptyMsg="No docking jobs yet"
          renderItem={(item, i) => (
            <div key={i} className="flex items-start justify-between gap-1 py-1 border-b border-gray-50 last:border-0">
              <div className="flex items-start gap-1 min-w-0">
                <input
                  type="checkbox"
                  checked={!!checkedJobs[item.name]}
                  onChange={() => setCheckedJobs(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                  className="mt-0.5 mr-1 flex-shrink-0 cursor-pointer"
                />
                <div className="text-xs text-gray-600 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className={`text-xs mt-0.5 ${
                    item.status === "done" ? "text-green-600"
                    : item.status === "running" ? "text-blue-600"
                    : item.status === "failed" ? "text-red-500"
                    : "text-yellow-600"
                  }`}>{item.status}</div>
                </div>
              </div>
            </div>
          )}
        />
      </aside>
    </>
  );
}