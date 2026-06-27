import React from "react";
import MainLayout from "../components/layout/MainLayout";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";
import ProteinSearch from "../components/protein/ProteinSearch";
import PdbSearchModule from "../components/protein/PdbSearchModule";
import DockingModule from "../components/docking/DockingModule";
import AnalyticsModule from "../components/analytics/AnalyticsModule";
import DeepPKModule from "../components/deeppk/DeepPKModule";
import PeptideCutterModule from "../components/peptide_cutter/PeptideCutterModule";

import ChemVaultDashboard from "./ChemVaultDashboard";
import LoginPage from "./LoginPage";
import ContactPage from "./ContactPage";
import WorkspaceView from "../components/workspace/WorkspaceView";
import HomePage from "./HomePage";

export default function Dashboard() {
  const { activeModule } = useWorkspace();
  const { user } = useAuth();

  // Clear hash when moving away from landing page to keep URL clean
  React.useEffect(() => {
    if (activeModule !== "landing" && window.location.hash) {
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }
  }, [activeModule]);

  // Full-Screen Informational Home Page
  if (activeModule === "landing") {
    return <HomePage />;
  }

  // Full-Screen Authentication Page (if not logged in)
  if (!user && ["login", "register", "forgot"].includes(activeModule)) {
    return <LoginPage initialMode={activeModule === "forgot" ? "forgot" : activeModule} />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case "landing":
        return <HomePage />;
      case "ligand":
        return <ChemVaultDashboard />;
      case "protein_search":
        return <PdbSearchModule />;
      case "protein":
        return <ProteinSearch />;
      case "docking":
        return user ? <DockingModule /> : <LoginPage initialMode="login" />;
      case "analytics":
        return user ? <AnalyticsModule /> : <LoginPage initialMode="login" />;
      case "fileprep":
        return user ? <FilePrepModule /> : <LoginPage initialMode="login" />;
      case "deeppk":
        return user ? <DeepPKModule /> : <LoginPage initialMode="login" />;
      case "peptide_cutter":
        return user ? <PeptideCutterModule /> : <LoginPage initialMode="login" />;
      case "login":
        return <LoginPage initialMode="login" />;
      case "register":
        return <LoginPage initialMode="register" />;
      case "contact":
        return <ContactPage />;
      case "user_workspace":
        return <WorkspaceView />;
      default:
        return <ChemVaultDashboard />;
    }
  };

  return (
    <MainLayout>
      <div className={activeModule === "ligand" ? "" : "hidden"}>
        <ChemVaultDashboard />
      </div>
      <div className={activeModule === "protein_search" ? "" : "hidden"}>
        <PdbSearchModule />
      </div>
      <div className={activeModule === "protein" ? "" : "hidden"}>
        <ProteinSearch />
      </div>
      <div className={activeModule === "user_workspace" ? "" : "hidden"}>
        <WorkspaceView />
      </div>
      {user && (
        <>
          <div className={activeModule === "deeppk" ? "" : "hidden"}>
            <DeepPKModule />
          </div>
          <div className={activeModule === "docking" ? "" : "hidden"}>
            <DockingModule />
          </div>
          <div className={activeModule === "analytics" ? "" : "hidden"}>
            <AnalyticsModule />
          </div>
          <div className={activeModule === "peptide_cutter" ? "" : "hidden"}>
            <PeptideCutterModule />
          </div>
        </>
      )}
      {((!user && ["deeppk", "docking", "analytics", "peptide_cutter"].includes(activeModule)) || 
        ["login", "register", "contact", "fileprep"].includes(activeModule)) && (
        renderModule()
      )}
    </MainLayout>
  );
}

function FilePrepModule() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">File Preparation</h2>
      <p className="text-xs text-gray-500 mb-4">Prepare molecular files for docking</p>
      <div className="border border-dashed border-gray-300 rounded-md p-8 text-center bg-white">
        <div className="text-3xl mb-3">📁</div>
        <div className="text-sm font-medium text-gray-500">File Preparation Module</div>
        <div className="text-xs text-gray-400 mt-1">OpenBabel integration coming soon</div>
      </div>
    </div>
  );
}