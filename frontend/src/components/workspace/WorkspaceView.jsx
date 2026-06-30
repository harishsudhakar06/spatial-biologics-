import React, { useState } from "react";
import { saveFile } from "../../utils/downloadHelper";
import { 
  useWorkspace 
} from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { 
  Briefcase, 
  Trash2, 
  Download, 
  Database, 
  FileText, 
  FlaskConical, 
  Dna, 
  Target, 
  FolderPlus, 
  ExternalLink,
  ChevronDown,
  Info,
  CheckCircle,
  FileDown,
  ArrowLeft,
  Search
} from "lucide-react";

export default function WorkspaceView() {
  const {
    downloadedLigands = [],
    removeDownloadedLigand,
    ligandFiles = [],
    removeLigandFile,
    downloadedProteins = [],
    removeDownloadedProtein,
    dockingJobs = [],
    removeDockingJob,
    activeProjectId,
    changeActiveProject,
    projects = {},
    createNewProject,
    prevModule,
    setActiveModule
  } = useWorkspace();

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ligands"); // ligands | proteins | docking
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Switch Active Project handler
  const handleProjectChange = (e) => {
    changeActiveProject(e.target.value);
    showToast(`Switched active project to ${e.target.value}`);
  };

  // Create New Project handler
  const handleCreateProject = () => {
    createNewProject();
    showToast("Created new workspace project!");
  };

  // Helper to trigger a file download from text content
  const triggerTextDownload = async (filename, text) => {
    const ext = filename.split(".").pop();
    const mimeMap = {
      smi: "text/plain",
      fasta: "text/plain",
      json: "application/json",
      pdb: "text/plain",
      pdbqt: "text/plain",
      txt: "text/plain",
      csv: "text/csv"
    };
    const mimeType = mimeMap[ext] || "text/plain";
    const fileDesc = `${ext.toUpperCase()} Files`;
    const acceptMap = { [mimeType]: [`.${ext}`] };
    await saveFile(text, filename, fileDesc, acceptMap);
  };

  // Individual Downloaders
  const downloadLigandSMI = (ligand) => {
    const text = `# Chemical Compound SMILES\n# Name: ${ligand.name || "Unknown"}\n# Formula: ${ligand.formula || "N/A"}\n# CID: ${ligand.cid}\n${ligand.smiles}\n`;
    triggerTextDownload(`ligand_cid_${ligand.cid}.smi`, text);
    showToast("Downloaded SMILES file");
  };

  const downloadLigandFile = (file) => {
    if (file.content) {
      triggerTextDownload(file.fileName || file.name || "ligand_file.txt", file.content);
      showToast("Downloaded original ligand file");
    } else {
      showToast("Original file content not available", "error");
    }
  };

  const downloadProteinFASTA = (protein) => {
    // Generate FASTA text skeleton
    const text = `>gi|ProteinDatabase|${protein.accession} ${protein.entryName || protein.accession} | ${protein.gene || "Gene N/A"} | ${protein.organism || "Organism N/A"}\n# Please refer to public databases for full amino acid sequence.\n# Standard link: https://www.uniprot.org/uniprotkb/${protein.accession}.fasta\n`;
    triggerTextDownload(`protein_${protein.accession}.fasta`, text);
    showToast("Downloaded FASTA template");
  };

  // Global Project Exporter (JSON)
  const exportProjectJSON = () => {
    const projectData = {
      projectId: activeProjectId,
      exportedAt: new Date().toISOString(),
      user: user ? user.username : "Guest User",
      data: {
        ligands: {
          pubchem: downloadedLigands,
          uploaded: ligandFiles
        },
        proteins: downloadedProteins,
        dockingJobs: dockingJobs
      }
    };
    triggerTextDownload(`chemvault_project_${activeProjectId}.json`, JSON.stringify(projectData, null, 2));
    showToast("Exported project data as JSON");
  };

  // Clear Active Project Workspace
  const clearActiveWorkspace = () => {
    if (window.confirm("Are you sure you want to clear all data in the active project workspace?")) {
      downloadedLigands.forEach(l => removeDownloadedLigand(l.cid));
      ligandFiles.forEach(f => removeLigandFile(f.key));
      downloadedProteins.forEach(p => removeDownloadedProtein(p.accession + "_" + p.format));
      dockingJobs.forEach(j => removeDockingJob(j.name));
      showToast("Workspace project cleared!");
    }
  };

  // Filters for Search Query
  const filteredLigands = [
    ...downloadedLigands.map(l => ({ ...l, _type: "pubchem" })),
    ...ligandFiles.map(f => ({ ...f, _type: "file" }))
  ].filter(item => {
    const q = searchQuery.toLowerCase();
    const name = (item.name || item.fileName || "").toLowerCase();
    const formula = (item.formula || "").toLowerCase();
    const cid = String(item.cid || "").toLowerCase();
    return name.includes(q) || formula.includes(q) || cid.includes(q);
  });

  const filteredProteins = downloadedProteins.filter(p => {
    const q = searchQuery.toLowerCase();
    const accession = (p.accession || "").toLowerCase();
    const entryName = (p.entryName || "").toLowerCase();
    const gene = (p.gene || "").toLowerCase();
    const organism = (p.organism || "").toLowerCase();
    return accession.includes(q) || entryName.includes(q) || gene.includes(q) || organism.includes(q);
  });

  const filteredJobs = dockingJobs.filter(j => {
    const q = searchQuery.toLowerCase();
    return (j.name || "").toLowerCase().includes(q);
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)",
      color: "#0f172a",
      fontFamily: "Inter, sans-serif",
      padding: "32px",
      position: "relative",
      boxSizing: "border-box",
      overflow: "hidden"
    }}>
      
      {/* Background Animated Blobs */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
      </div>
      
      {/* Dynamic Slide-In Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Slow Floating Background Blobs */
        @keyframes float1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(60px, 80px) scale(1.15); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float2 {
          0% { transform: translate(0px, 0px) scale(1.1); }
          50% { transform: translate(-80px, 60px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1.1); }
        }
        @keyframes float3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, -70px) scale(1.08); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .bubble {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.35;
          pointer-events: none;
        }
        .bubble-1 {
          top: 8%;
          left: 12%;
          width: 320px;
          height: 320px;
          background: #7dd3fc;
          animation: float1 22s ease-in-out infinite;
        }
        .bubble-2 {
          bottom: 12%;
          right: 8%;
          width: 400px;
          height: 400px;
          background: #38bdf8;
          animation: float2 28s ease-in-out infinite;
        }
        .bubble-3 {
          top: 48%;
          left: 38%;
          width: 250px;
          height: 250px;
          background: #93c5fd;
          animation: float3 16s ease-in-out infinite;
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .workspace-card {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.45);
          box-shadow: 0 10px 30px -10px rgba(3, 105, 161, 0.08);
          border-radius: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
          z-index: 2;
          animation: cardFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .workspace-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 36px -8px rgba(3, 105, 161, 0.15);
        }
        .glow-button {
          transition: background-color 0.2s, box-shadow 0.2s, transform 0.1s;
          position: relative;
          z-index: 2;
        }
        .glow-button:hover {
          box-shadow: 0 0 16px rgba(14, 165, 233, 0.4);
          transform: scale(1.02);
        }
        .glow-button:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? "#ef4444" : "#0284c7",
          color: "#fff", padding: "12px 22px", borderRadius: 12,
          fontSize: 14, fontWeight: 600, boxShadow: "0 10px 25px rgba(3, 105, 161, 0.25)",
          display: "flex", alignItems: "center", gap: 10,
          animation: "fadeInUp 0.25s ease forwards"
        }}>
          {toast.type === "error" ? <Info size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Workspace Header */}
      <div className="animate-fade-in-up" style={{ marginBottom: "28px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button 
                onClick={() => setActiveModule(prevModule)}
                className="glow-button"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  padding: "8px 14px", background: "rgba(255, 255, 255, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.5)", borderRadius: "10px",
                  color: "#0369a1", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                  marginRight: "4px", boxShadow: "0 2px 8px rgba(3, 105, 161, 0.05)"
                }}
                title="Go Back"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div style={{ background: "#bae6fd", padding: "8px", borderRadius: "10px", color: "#0369a1" }}>
                <Briefcase size={22} />
              </div>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0369a1", margin: 0 }}>Research Workspace</h2>
            </div>
            <p style={{ fontSize: "14px", color: "#475569", marginTop: "6px", marginLeft: "42px" }}>
              Manage and download molecular targets, files, and simulations added to your active project.
            </p>
          </div>

          {/* Project Sessions Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255, 255, 255, 0.6)", padding: "6px 12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.4)" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#0369a1" }}>Project:</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select 
                value={activeProjectId} 
                onChange={handleProjectChange}
                style={{
                  background: "#fff", border: "1px solid #bae6fd", borderRadius: "8px",
                  padding: "5px 28px 5px 10px", fontSize: "13px", fontWeight: 600, color: "#0369a1",
                  outline: "none", cursor: "pointer", appearance: "none"
                }}
              >
                {Object.keys(projects).map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#0369a1" style={{ position: "absolute", right: 8, pointerEvents: "none" }} />
            </div>
            <button 
              onClick={handleCreateProject} 
              className="glow-button"
              style={{
                background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px",
                padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px"
              }}
              title="Create New Project"
            >
              <FolderPlus size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Control Actions & Search */}
      <div className="animate-fade-in-up" style={{ 
        display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", 
        gap: "16px", marginBottom: "24px", position: "relative", zIndex: 1
      }}>
        {/* Search Input */}
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter workspace files..."
          style={{
            background: "rgba(255, 255, 255, 0.7)", border: "1px solid rgba(255, 255, 255, 0.5)",
            borderRadius: "10px", padding: "10px 16px", fontSize: "14px", color: "#0f172a",
            width: "300px", maxWidth: "100%", outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)"
          }}
        />

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={exportProjectJSON}
            className="glow-button"
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px",
              background: "#0284c7", color: "#fff", border: "none", borderRadius: "10px",
              fontSize: "13px", fontWeight: 600, cursor: "pointer"
            }}
          >
            <FileDown size={15} /> Export Project (JSON)
          </button>
          
          <button 
            onClick={clearActiveWorkspace}
            className="glow-button"
            style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px",
              background: "#ef4444", color: "#fff", border: "none", borderRadius: "10px",
              fontSize: "13px", fontWeight: 600, cursor: "pointer"
            }}
          >
            <Trash2 size={15} /> Clear Project Files
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="animate-fade-in-up" style={{ 
        display: "flex", gap: "12px", borderBottom: "2px solid rgba(2, 132, 199, 0.15)", 
        paddingBottom: "12px", marginBottom: "28px", position: "relative", zIndex: 1
      }}>
        {[
          { id: "ligands", label: "Ligands", count: downloadedLigands.length + ligandFiles.length, icon: FlaskConical },
          { id: "protein_search", label: "Protein Search", count: downloadedProteins.filter(p => p.format === "pdb").length, icon: Search },
          { id: "protein_library", label: "Protein Library", count: downloadedProteins.filter(p => p.format !== "pdb").length, icon: Dna },
          { id: "docking", label: "Docking Simulations", count: dockingJobs.length, icon: Target }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px",
                borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600,
                transition: "all 0.2s ease",
                background: isCurrent ? "#0284c7" : "rgba(255, 255, 255, 0.45)",
                color: isCurrent ? "#fff" : "#0369a1",
                boxShadow: isCurrent ? "0 4px 14px rgba(2, 132, 199, 0.25)" : "none"
              }}
            >
              <TabIcon size={16} />
              <span>{tab.label}</span>
              <span style={{
                fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
                background: isCurrent ? "rgba(255,255,255,0.25)" : "rgba(2, 132, 199, 0.1)",
                color: isCurrent ? "#fff" : "#0284c7"
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="animate-fade-in-up" style={{ position: "relative", zIndex: 1 }}>
        
        {/* LIGANDS TAB */}
        {activeTab === "ligands" && (
          <div>
            {filteredLigands.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.4)", borderRadius: "16px" }}>
                <FlaskConical size={36} color="#0369a1" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                <p style={{ color: "#475569", fontSize: "14px" }}>No ligands found matching your workspace search query.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {filteredLigands.map((item, idx) => (
                  <div key={item.key || item.cid || idx} className="workspace-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", animationDelay: `${idx * 0.04}s` }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "12px",
                          background: item._type === "pubchem" ? "#dbeafe" : "#fef9c3",
                          color: item._type === "pubchem" ? "#1e40af" : "#854d0e"
                        }}>
                          {item._type === "pubchem" ? "Database Compound" : "Uploaded File"}
                        </span>
                        {item.addedAt && (
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {new Date(item.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0369a1", margin: "0 0 6px 0", wordBreak: "break-all" }}>
                        {item.name || item.fileName || "Unnamed Compound"}
                      </h4>
                      {item.formula && (
                        <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 8px 0" }}>
                          Formula: <strong style={{ color: "#0369a1" }}>{item.formula}</strong>
                        </p>
                      )}
                      
                      {item.smiles && (
                        <div style={{ background: "rgba(255,255,255,0.8)", border: "1px solid #bae6fd", borderRadius: "8px", padding: "8px", margin: "8px 0", overflowX: "auto" }}>
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#0284c7", whiteSpace: "nowrap" }}>
                            {item.smiles}
                          </span>
                        </div>
                      )}
                      {item.type && (
                        <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>
                          Type: <strong>{item.type}</strong>
                        </p>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "16px", borderTop: "1px solid rgba(2, 132, 199, 0.1)", paddingTop: "12px" }}>
                      <button 
                        onClick={() => item._type === "pubchem" ? downloadLigandSMI(item) : downloadLigandFile(item)}
                        className="glow-button"
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                          background: "#e0f2fe", border: "1px solid #bae6fd", color: "#0369a1",
                          borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        <Download size={13} /> Download
                      </button>
                      <button 
                        onClick={() => item._type === "pubchem" ? removeDownloadedLigand(item.cid) : removeLigandFile(item.key)}
                        style={{
                          background: "transparent", border: "none", color: "#ef4444",
                          cursor: "pointer", padding: "6px", display: "flex", alignItems: "center"
                        }}
                        title="Remove from project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROTEINS TAB */}
        {/* PROTEIN SEARCH TAB */}
        {activeTab === "protein_search" && (
          <div>
            {filteredProteins.filter(p => p.format === "pdb").length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.4)", borderRadius: "16px" }}>
                <Search size={36} color="#0369a1" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                <p style={{ color: "#475569", fontSize: "14px" }}>No protein search structures found in this workspace project.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {filteredProteins.filter(p => p.format === "pdb").map((protein, idx) => {
                  const pKey = protein.accession + "_" + protein.format;
                  return (
                    <div key={pKey} className="workspace-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "12px",
                            background: "#fef3c7", color: "#b45309"
                          }}>
                            PDB Target
                          </span>
                          {protein.addedAt && (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {new Date(protein.addedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0369a1", margin: "0 0 6px 0" }}>
                          {protein.entryName || protein.accession}
                        </h4>
                        
                        <div style={{ fontSize: "12px", color: "#475569" }}>
                          <p style={{ margin: "4px 0" }}>Structure ID: <strong>{protein.accession}</strong></p>
                          <p style={{ margin: "4px 0" }}>Classification: <strong>{protein.gene || "N/A"}</strong></p>
                          <p style={{ margin: "4px 0" }}>Organism: <strong>{protein.organism || "N/A"}</strong></p>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "16px", borderTop: "1px solid rgba(2, 132, 199, 0.1)", paddingTop: "12px" }}>
                        <button 
                          onClick={() => window.open(`https://files.rcsb.org/download/${protein.accession}.pdb`)}
                          className="glow-button"
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            background: "#e0f2fe", border: "1px solid #bae6fd", color: "#0369a1",
                            borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          <ExternalLink size={13} /> Fetch Structure
                        </button>
                        <button 
                          onClick={() => removeDownloadedProtein(pKey)}
                          style={{
                            background: "transparent", border: "none", color: "#ef4444",
                            cursor: "pointer", padding: "6px", display: "flex", alignItems: "center"
                          }}
                          title="Remove from project"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROTEIN LIBRARY TAB */}
        {activeTab === "protein_library" && (
          <div>
            {filteredProteins.filter(p => p.format !== "pdb").length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.4)", borderRadius: "16px" }}>
                <Dna size={36} color="#0369a1" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                <p style={{ color: "#475569", fontSize: "14px" }}>No library proteins found in this workspace project.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {filteredProteins.filter(p => p.format !== "pdb").map((protein, idx) => {
                  const pKey = protein.accession + "_" + protein.format;
                  return (
                    <div key={pKey} className="workspace-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <span style={{
                            fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "12px",
                            background: "#dcfce7", color: "#15803d"
                          }}>
                            {protein.format.toUpperCase()} Target
                          </span>
                          {protein.addedAt && (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {new Date(protein.addedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0369a1", margin: "0 0 6px 0" }}>
                          {protein.entryName || protein.accession}
                        </h4>
                        
                        <div style={{ fontSize: "12px", color: "#475569" }}>
                          <p style={{ margin: "4px 0" }}>Accession: <strong>{protein.accession}</strong></p>
                          <p style={{ margin: "4px 0" }}>Gene: <strong>{protein.gene || "N/A"}</strong></p>
                          <p style={{ margin: "4px 0" }}>Organism: <strong>{protein.organism || "N/A"}</strong></p>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "16px", borderTop: "1px solid rgba(2, 132, 199, 0.1)", paddingTop: "12px" }}>
                        <button 
                          onClick={() => downloadProteinFASTA(protein)}
                          className="glow-button"
                          style={{
                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                            background: "#e0f2fe", border: "1px solid #bae6fd", color: "#0369a1",
                            borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          <Download size={13} /> Sequence FASTA
                        </button>
                        <button 
                          onClick={() => removeDownloadedProtein(pKey)}
                          style={{
                            background: "transparent", border: "none", color: "#ef4444",
                            cursor: "pointer", padding: "6px", display: "flex", alignItems: "center"
                          }}
                          title="Remove from project"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DOCKING TAB */}
        {activeTab === "docking" && (
          <div>
            {filteredJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.4)", borderRadius: "16px" }}>
                <Target size={36} color="#0369a1" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                <p style={{ color: "#475569", fontSize: "14px" }}>No docking simulations found in this workspace project.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                {filteredJobs.map((job, idx) => (
                  <div key={job.name} className="workspace-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", animationDelay: `${idx * 0.04}s` }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "12px",
                          background: "#f3e8ff", color: "#6b21a8"
                        }}>
                          Vina Simulation
                        </span>
                        {job.addedAt && (
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {new Date(job.addedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#0369a1", margin: "0 0 6px 0", wordBreak: "break-all" }}>
                        {job.name}
                      </h4>
                      
                      <p style={{ fontSize: "12px", color: "#475569", margin: "4px 0" }}>
                        Modes: <strong style={{ color: "#0f172a" }}>{job.modes?.length || 0} poses</strong>
                      </p>

                      {job.modes && job.modes.length > 0 && (
                        <div style={{ 
                          background: "rgba(255, 255, 255, 0.8)", border: "1px solid #bae6fd", 
                          borderRadius: "10px", padding: "10px", marginTop: "10px" 
                        }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#0369a1", display: "block", marginBottom: "6px" }}>
                            Simulation Binding Energies:
                          </span>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid #bae6fd" }}>
                                <th style={{ textAlign: "left", padding: "4px", color: "#64748b" }}>Pose</th>
                                <th style={{ textAlign: "right", padding: "4px", color: "#64748b" }}>Affinity (kcal/mol)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {job.modes.slice(0, 3).map((m, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid rgba(2, 132, 199, 0.05)" }}>
                                  <td style={{ padding: "4px", color: "#475569" }}>
                                    {idx === 0 && <span style={{ background: "#22c55e", color: "#fff", borderRadius: "3px", padding: "1px 4px", fontSize: "9px", marginRight: "4px" }}>Best</span>}
                                    Mode {m.mode}
                                  </td>
                                  <td style={{ textAlign: "right", padding: "4px", fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? "#16a34a" : "#0f172a" }}>
                                    {m.affinity}
                                  </td>
                                </tr>
                              ))}
                              {job.modes.length > 3 && (
                                <tr>
                                  <td colSpan="2" style={{ padding: "4px", color: "#64748b", fontSize: "10px", textAlign: "center" }}>
                                    + {job.modes.length - 3} more binding poses
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "16px", borderTop: "1px solid rgba(2, 132, 199, 0.1)", paddingTop: "12px" }}>
                      <button 
                        onClick={() => window.open(`http://localhost:5000/api/docking/download/${job.outFile}`)}
                        className="glow-button"
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                          background: "#e0f2fe", border: "1px solid #bae6fd", color: "#0369a1",
                          borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        <Download size={13} /> Out PDBQT
                      </button>
                      <button 
                        onClick={() => removeDockingJob(job.name)}
                        style={{
                          background: "transparent", border: "none", color: "#ef4444",
                          cursor: "pointer", padding: "6px", display: "flex", alignItems: "center"
                        }}
                        title="Remove from project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
