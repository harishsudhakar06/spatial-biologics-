import React, { useState } from "react";
import {
  FlaskConical,
  Dna,
  Target,
  BarChart2,
  ChevronRight,
  Beaker,
  Menu,
  X,
  Briefcase,
  Search,
  Scissors,
  Crown,
  ChevronLeft,
} from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";

const MODULES = [
  {
    id: "ligand",
    label: "Ligand Database",
    icon: FlaskConical,
    requiresAuth: false,
    description: "Search chemical compounds",
  },
  {
    id: "protein_search",
    label: "Protein Search",
    icon: Search,
    requiresAuth: false,
    description: "Search PDB structures",
  },
  {
    id: "protein",
    label: "Protein Library",
    icon: Dna,
    requiresAuth: false,
    description: "Protein structures & models",
  },
  {
    id: "deeppk",
    label: "ADMET",
    icon: Beaker,
    requiresAuth: true,
    description: "ADMET prediction",
  },
  {
    id: "docking",
    label: "Docking",
    icon: Target,
    requiresAuth: true,
    description: "Molecular docking",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart2,
    requiresAuth: true,
    description: "Analyze results",
    subItems: ["PCA", "RMSD", "RMSF", "FEL", "MD Analysis", "Clustering", "H-Bond", "MM-PBSA"],
  },
  {
    id: "peptide_cutter",
    label: "Peptide Cutter",
    icon: Scissors,
    requiresAuth: true,
    description: "Protein digestion predictor",
  },
];

export default function Sidebar() {
  const { activeModule, setActiveModule } = useWorkspace();
  const { user } = useAuth();
  const [expandedAnalytics, setExpandedAnalytics] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="bg-white border-r border-slate-200 flex-shrink-0 h-full flex flex-col justify-between select-none relative z-40"
      style={{
        width: collapsed ? 72 : 240,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Sidebar Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="absolute -right-3.5 top-6 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm hover:shadow transition-all cursor-pointer z-50 focus:outline-none"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronRight
          size={14}
          style={{
            transition: "transform 0.25s",
            transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
          }}
        />
      </button>

      <div className="flex-1 flex flex-col overflow-y-auto min-h-0 py-4">
        {/* Brand/Logo Area */}
        <div className={`px-4 mb-5 flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Dna size={18} className="animate-pulse" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-slate-800 text-base tracking-tight font-head">
              Spatial Biologics
            </span>
          )}
        </div>

        {/* Modules label */}
        {!collapsed && (
          <div className="mb-2 px-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Modules
            </span>
          </div>
        )}

        {/* Navigation list */}
        <nav className="px-3 space-y-2.5">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            const isLocked = mod.requiresAuth && !user;

            return (
              <div key={mod.id}>
                <button
                  onClick={() => {
                    if (isLocked) { setActiveModule("login"); return; }
                    if (mod.id === "analytics") {
                      setExpandedAnalytics(prev => !prev);
                      setActiveModule("analytics");
                    } else {
                      setActiveModule(mod.id);
                    }
                  }}
                  title={collapsed ? mod.label : ""}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all group relative cursor-pointer focus:outline-none
                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/10"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                    ${isLocked ? "opacity-60" : ""}
                    ${collapsed ? "justify-center" : ""}
                  `}
                >
                  <div
                    className={`flex items-center justify-center rounded-lg flex-shrink-0 transition-colors
                      ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-600"
                      }
                    `}
                  >
                    <Icon size={18} />
                  </div>

                  {!collapsed && (
                    <span className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{mod.label}</span>
                      <span className="flex items-center gap-1">
                        {isLocked && <span className="text-xs text-slate-400">🔒</span>}
                        {mod.subItems && (
                          <ChevronRight
                            size={14}
                            className={`transition-transform duration-200 ${
                              expandedAnalytics && isActive ? "rotate(90deg)" : "rotate(0deg)"
                            } ${isActive ? "text-white" : "text-slate-400"}`}
                          />
                        )}
                      </span>
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                      {mod.label} {isLocked && "🔒"}
                    </div>
                  )}
                </button>

                {!collapsed && mod.subItems && expandedAnalytics && isActive && (
                  <div className="ml-8 mt-1 pl-2 border-l border-slate-100 space-y-1">
                    {mod.subItems.map((sub) => (
                      <button
                        key={sub}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none"
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Sidebar bottom section */}
      <div className="border-t border-slate-100 py-3">
        {/* Workspace navigation button */}
        <div className="px-3">
          <button
            onClick={() => setActiveModule("user_workspace")}
            title={collapsed ? "Workspace" : ""}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all group relative cursor-pointer focus:outline-none
              ${
                activeModule === "user_workspace"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/10"
                  : "text-slate-650 hover:bg-slate-50 hover:text-slate-900"
              }
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <div
              className={`flex items-center justify-center rounded-lg flex-shrink-0 transition-colors
                ${
                  activeModule === "user_workspace"
                    ? "text-white"
                    : "text-slate-400 group-hover:text-slate-600"
                }
              `}
            >
              <Briefcase size={18} />
            </div>
            {!collapsed && <span className="truncate">Workspace</span>}
            {collapsed && (
              <div className="absolute left-16 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md">
                Workspace
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}