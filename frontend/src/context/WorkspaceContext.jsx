import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const WorkspaceContext = createContext(null);

const EMPTY = {
  downloadedLigands: [],
  ligandFiles: [],
  downloadedProteins: [],
  dockingJobs: [],
};

const formatProjectId = (num) => `SPB${String(num).padStart(3, '0')}`;

const DEFAULT_WORKSPACE = {
  activeProjectId: "SPB001",
  projects: {
    "SPB001": { ...EMPTY }
  }
};

function loadForUser(userId) {
  if (!userId) return DEFAULT_WORKSPACE;
  try {
    const raw = localStorage.getItem("workspace_" + userId);
    if (!raw) return DEFAULT_WORKSPACE;
    const parsed = JSON.parse(raw);
    if (!parsed.projects || !parsed.activeProjectId) {
      return DEFAULT_WORKSPACE;
    }
    return parsed;
  } catch {
    return DEFAULT_WORKSPACE;
  }
}

function saveForUser(userId, data) {
  if (!userId) return;
  try {
    localStorage.setItem("workspace_" + userId, JSON.stringify(data));
  } catch {}
}

export function WorkspaceProvider({ children, user }) {
  const [activeModule, setActiveModuleState] = useState("landing");
  const [prevModule, setPrevModule] = useState("landing");

  const setActiveModule = useCallback((mod) => {
    setActiveModuleState(current => {
      if (current !== "user_workspace" && mod === "user_workspace") {
        setPrevModule(current);
      }
      return mod;
    });
  }, []);
  const [downloadedLigands, setDownloadedLigands] = useState([]);
  const [ligandFiles, setLigandFiles] = useState([]);
  const [downloadedProteins, setDownloadedProteins] = useState([]);
  const [dockingJobs, setDockingJobs] = useState([]);

  // ── NEW: incoming SMILES from Ligand → ADMET ──────────────────
  const [admetSmiles, setAdmetSmiles] = useState(null);

  // ── NEW: incoming redirect query from PDB Search → Protein Library ──
  const [proteinSearchQuery, setProteinSearchQuery] = useState(null);

  const [activeProjectId, setActiveProjectId] = useState("SPB001");
  const [projects, setProjects] = useState({ "SPB001": { ...EMPTY } });

  const [openModules, setOpenModules] = useState(["ligand", "protein_search", "protein", "deeppk", "docking", "analytics", "peptide_cutter"]);

  // Automatically open tab when a module is activated
  useEffect(() => {
    const mainModules = ["ligand", "protein_search", "protein", "deeppk", "docking", "analytics", "peptide_cutter"];
    if (mainModules.includes(activeModule)) {
      setOpenModules(prev => {
        if (prev.includes(activeModule)) return prev;
        return [...prev, activeModule];
      });
    }
  }, [activeModule]);

  const closeModule = (modId) => {
    setOpenModules(prev => {
      const next = prev.filter(m => m !== modId);
      if (activeModule === modId) {
        if (next.length > 0) {
          setActiveModule(next[next.length - 1]);
        } else {
          setActiveModule("ligand");
        }
      }
      return next;
    });
  };

  const userId = user?.id || user?.email || null;
  const prevUserId = useRef(userId);

  // Monitor login/logout transitions
  useEffect(() => {
    if (prevUserId.current && !userId) {
      // Logout occurred! Mark flag for previous user
      localStorage.setItem("needs_new_project_" + prevUserId.current, "true");
    }
    prevUserId.current = userId;
  }, [userId]);

  // Load user data or auto-create a new project ID on new login
  useEffect(() => {
    let wsData = loadForUser(userId);

    if (userId && localStorage.getItem("needs_new_project_" + userId) === "true") {
      localStorage.setItem("needs_new_project_" + userId, "false");
      
      let num = 1;
      while (wsData.projects[formatProjectId(num)]) {
        num++;
      }
      const newProjId = formatProjectId(num);
      wsData.projects[newProjId] = { ...EMPTY };
      wsData.activeProjectId = newProjId;
      saveForUser(userId, wsData);
    }

    setProjects(wsData.projects || { "SPB001": { ...EMPTY } });
    setActiveProjectId(wsData.activeProjectId || "SPB001");

    // Initialize individual lists from the loaded active project
    const activeProject = (wsData.projects && wsData.projects[wsData.activeProjectId]) || EMPTY;
    setDownloadedLigands(activeProject.downloadedLigands || []);
    setLigandFiles(activeProject.ligandFiles || []);
    setDownloadedProteins(activeProject.downloadedProteins || []);
    setDockingJobs(activeProject.dockingJobs || []);

    // Sync with backend on startup / login
    if (userId) {
      fetch("/api/workspace")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.workspace && data.workspace.projects) {
            setProjects(data.workspace.projects);
            setActiveProjectId(data.workspace.activeProjectId);
            const backendActive = data.workspace.projects[data.workspace.activeProjectId] || EMPTY;
            setDownloadedLigands(backendActive.downloadedLigands || []);
            setLigandFiles(backendActive.ligandFiles || []);
            setDownloadedProteins(backendActive.downloadedProteins || []);
            setDockingJobs(backendActive.dockingJobs || []);
            saveForUser(userId, data.workspace);
          }
        })
        .catch(err => console.warn("Backend workspace sync failed:", err));
    }
  }, [userId]);

  // Sync activeProjectId changes to individual states
  useEffect(() => {
    const activeProject = projects[activeProjectId] || EMPTY;
    setDownloadedLigands(activeProject.downloadedLigands || []);
    setLigandFiles(activeProject.ligandFiles || []);
    setDownloadedProteins(activeProject.downloadedProteins || []);
    setDockingJobs(activeProject.dockingJobs || []);
  }, [activeProjectId]);

  // Sync individual list updates back to the project and save
  useEffect(() => {
    if (!userId) return;
    const currentActive = projects[activeProjectId] || EMPTY;
    if (
      currentActive.downloadedLigands !== downloadedLigands ||
      currentActive.ligandFiles !== ligandFiles ||
      currentActive.downloadedProteins !== downloadedProteins ||
      currentActive.dockingJobs !== dockingJobs
    ) {
      setProjects(prev => {
        const updated = {
          ...prev,
          [activeProjectId]: {
            downloadedLigands,
            ligandFiles,
            downloadedProteins,
            dockingJobs
          }
        };
        saveForUser(userId, {
          activeProjectId,
          projects: updated
        });
        return updated;
      });
    }
  }, [downloadedLigands, ligandFiles, downloadedProteins, dockingJobs, activeProjectId, userId]);

  // Sync workspace state changes to backend database (with debounce)
  useEffect(() => {
    if (!userId) return;
    
    const syncToBackend = async () => {
      try {
        const res = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeProjectId, projects })
        });
        const data = await res.json();
        if (data.success && data.workspace && data.workspace.projects) {
          let hasMissingAddedAt = false;
          for (const [projId, proj] of Object.entries(projects)) {
            const backendProj = data.workspace.projects[projId];
            if (!backendProj) continue;
            
            if (
              proj.downloadedLigands?.some((l, idx) => !l.addedAt && backendProj.downloadedLigands?.[idx]?.addedAt) ||
              proj.ligandFiles?.some((f, idx) => !f.addedAt && backendProj.ligandFiles?.[idx]?.addedAt) ||
              proj.downloadedProteins?.some((p, idx) => !p.addedAt && backendProj.downloadedProteins?.[idx]?.addedAt) ||
              proj.dockingJobs?.some((j, idx) => !j.addedAt && backendProj.dockingJobs?.[idx]?.addedAt)
            ) {
              hasMissingAddedAt = true;
              break;
            }
          }
          
          if (hasMissingAddedAt) {
            setProjects(data.workspace.projects);
            const activeProject = data.workspace.projects[activeProjectId] || EMPTY;
            setDownloadedLigands(activeProject.downloadedLigands || []);
            setLigandFiles(activeProject.ligandFiles || []);
            setDownloadedProteins(activeProject.downloadedProteins || []);
            setDockingJobs(activeProject.dockingJobs || []);
            saveForUser(userId, data.workspace);
          }
        }
      } catch (err) {
        console.warn("Failed to sync workspace to backend:", err);
      }
    };

    const timer = setTimeout(syncToBackend, 800);
    return () => clearTimeout(timer);
  }, [projects, activeProjectId, userId]);

  const changeActiveProject = (projId) => {
    if (!projects[projId]) return;
    setActiveProjectId(projId);
    if (userId) {
      saveForUser(userId, {
        activeProjectId: projId,
        projects
      });
    }
  };

  const createNewProject = () => {
    let num = 1;
    while (projects[formatProjectId(num)]) {
      num++;
    }
    const newProjId = formatProjectId(num);
    const updatedProjects = {
      ...projects,
      [newProjId]: { ...EMPTY }
    };
    setProjects(updatedProjects);
    setActiveProjectId(newProjId);
    if (userId) {
      saveForUser(userId, {
        activeProjectId: newProjId,
        projects: updatedProjects
      });
    }
  };
  const mergeProjectIntoActive = (sourceProjId) => {
    if (!projects[sourceProjId] || sourceProjId === activeProjectId) return;
    const sourceProject = projects[sourceProjId];
    
    setDownloadedLigands(prev => {
      const existingCids = new Set(prev.map(l => l.cid));
      const newLigands = (sourceProject.downloadedLigands || []).filter(l => !existingCids.has(l.cid));
      return [...prev, ...newLigands].slice(0, 20);
    });

    setLigandFiles(prev => {
      const existingKeys = new Set(prev.map(f => f.key));
      const newFiles = (sourceProject.ligandFiles || []).filter(f => !existingKeys.has(f.key));
      return [...prev, ...newFiles].slice(0, 40);
    });

    setDownloadedProteins(prev => {
      const existingKeys = new Set(prev.map(p => `${p.accession}_${p.format}`));
      const newProteins = (sourceProject.downloadedProteins || []).filter(p => !existingKeys.has(`${p.accession}_${p.format}`));
      return [...prev, ...newProteins].slice(0, 20);
    });

    setDockingJobs(prev => {
      const existingNames = new Set(prev.map(j => j.name));
      const newJobs = (sourceProject.dockingJobs || []).filter(j => !existingNames.has(j.name));
      return [...prev, ...newJobs];
    });
  };
  const addItemsToProject = (targetProjId, itemsToCopy) => {
    if (!projects[targetProjId]) return;
    
    setProjects(prev => {
      const targetProj = prev[targetProjId] || { ...EMPTY };
      
      const updatedLigands = [...(targetProj.downloadedLigands || [])];
      const updatedFiles = [...(targetProj.ligandFiles || [])];
      const updatedProteins = [...(targetProj.downloadedProteins || [])];
      const updatedJobs = [...(targetProj.dockingJobs || [])];

      if (itemsToCopy.smiles) {
        itemsToCopy.smiles.forEach(item => {
          if (!updatedLigands.some(l => l.cid === item.cid)) {
            updatedLigands.push(item);
          }
        });
      }

      if (itemsToCopy.files) {
        itemsToCopy.files.forEach(item => {
          if (!updatedFiles.some(f => f.key === item.key)) {
            updatedFiles.push(item);
          }
        });
      }

      if (itemsToCopy.proteins) {
        itemsToCopy.proteins.forEach(item => {
          const key = `${item.accession}_${item.format}`;
          if (!updatedProteins.some(p => `${p.accession}_${p.format}` === key)) {
            updatedProteins.push(item);
          }
        });
      }

      if (itemsToCopy.jobs) {
        itemsToCopy.jobs.forEach(item => {
          if (!updatedJobs.some(j => j.name === item.name)) {
            updatedJobs.push(item);
          }
        });
      }

      const updatedProjects = {
        ...prev,
        [targetProjId]: {
          downloadedLigands: updatedLigands.slice(0, 20),
          ligandFiles: updatedFiles.slice(0, 40),
          downloadedProteins: updatedProteins.slice(0, 20),
          dockingJobs: updatedJobs
        }
      };

      if (targetProjId === activeProjectId) {
        setDownloadedLigands(updatedLigands.slice(0, 20));
        setLigandFiles(updatedFiles.slice(0, 40));
        setDownloadedProteins(updatedProteins.slice(0, 20));
        setDockingJobs(updatedJobs);
      }

      saveForUser(userId, {
        activeProjectId,
        projects: updatedProjects
      });

      return updatedProjects;
    });
  };
  const addDownloadedLigand = useCallback((ligand) => {
    setDownloadedLigands(prev => {
      const filtered = prev.filter(l => l.cid !== ligand.cid);
      return [{ cid: ligand.cid, smiles: ligand.smiles, name: ligand.name, formula: ligand.formula }, ...filtered].slice(0, 20);
    });
  }, []);

  const removeDownloadedLigand = useCallback((cid) => {
    setDownloadedLigands(prev => prev.filter(l => l.cid !== cid));
  }, []);

  const addLigandFile = useCallback((file) => {
    setLigandFiles(prev => {
      const filtered = prev.filter(f => f.key !== file.key);
      return [file, ...filtered].slice(0, 40);
    });
  }, []);

  const removeLigandFile = useCallback((key) => {
    setLigandFiles(prev => prev.filter(f => f.key !== key));
  }, []);

  const addDownloadedProtein = useCallback((protein) => {
    setDownloadedProteins(prev => {
      const key = protein.accession + "_" + protein.format;
      const filtered = prev.filter(p => (p.accession + "_" + p.format) !== key);
      return [protein, ...filtered].slice(0, 20);
    });
  }, []);

  const removeDownloadedProtein = useCallback((key) => {
    setDownloadedProteins(prev => prev.filter(p => (p.accession + "_" + p.format) !== key));
  }, []);

  const addDockingJob = useCallback((job) => {
    setDockingJobs(prev => {
      const filtered = prev.filter(j => j.name !== job.name);
      return [job, ...filtered];
    });
  }, []);

  const removeDockingJob = useCallback((name) => {
    setDockingJobs(prev => prev.filter(j => j.name !== name));
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      activeModule, setActiveModule, prevModule,
      downloadedLigands, addDownloadedLigand, removeDownloadedLigand,
      ligandFiles, addLigandFile, removeLigandFile,
      downloadedProteins, addDownloadedProtein, removeDownloadedProtein,
      dockingJobs, addDockingJob, removeDockingJob,
      admetSmiles, setAdmetSmiles,
      proteinSearchQuery, setProteinSearchQuery,
      // ── PROJECTS/SESSIONS ──
      activeProjectId, changeActiveProject,
      projects, createNewProject, mergeProjectIntoActive, addItemsToProject,
      // ── TABS ──
      openModules, closeModule
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}