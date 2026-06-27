import React, { useState, useEffect } from "react";
import { 
  FlaskConical, User, LogOut, MessageCircle, 
  Dna, Beaker, Target, BarChart2, Search, Scissors,
  Briefcase, Minus, ExternalLink, Bell, Sun, Moon, Monitor
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useTheme } from "../../context/ThemeContext";

const MODULE_DETAILS = {
  ligand: { label: "Ligand Database", icon: FlaskConical, color: "#2563eb" },
  protein_search: { label: "Protein Search", icon: Search, color: "#2563eb" },
  protein: { label: "Protein Library", icon: Dna, color: "#2563eb" },
  deeppk: { label: "ADMET", icon: Beaker, color: "#6366f1" },
  docking: { label: "Docking", icon: Target, color: "#0d9488" },
  analytics: { label: "Analytics", icon: BarChart2, color: "#475569" },
  peptide_cutter: { label: "Peptide Cutter", icon: Scissors, color: "#22c55e" }
};

export default function Header() {
  const { user, logout } = useAuth();
  const { 
    activeModule, setActiveModule, 
    openModules, closeModule 
  } = useWorkspace();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun size={14} className="text-amber-500" />;
    if (theme === "dark") return <Moon size={14} className="text-blue-400" />;
    return <Monitor size={14} className="text-slate-450" />;
  };

  const getThemeTitle = () => {
    if (theme === "light") return "Theme: Light Mode";
    if (theme === "dark") return "Theme: Dark Mode";
    return "Theme: System Preference";
  };

  const [isDocked, setIsDocked] = useState(() => {
    return localStorage.getItem("multitask_docked") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("multitask_docked", isDocked);
  }, [isDocked]);

  const activeDetail = MODULE_DETAILS[activeModule];

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-30 relative">
      {/* Active Module Indicator */}
      <div className="flex items-center gap-3">
        {activeDetail && (
          <>
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${activeDetail.color}15`, color: activeDetail.color }}
            >
              <activeDetail.icon size={16} />
            </div>
            <span className="font-semibold text-slate-800 text-sm font-head tracking-tight">
              {activeDetail.label}
            </span>
          </>
        )}
      </div>

      {/* Docked Multitasking Tabs */}
      {isDocked && openModules.length > 0 && (
        <div className="flex-1 flex items-center justify-center max-w-xl mx-auto px-4 border-l border-r border-slate-100 h-8">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-md no-scrollbar">
            {openModules.map(modId => {
              const detail = MODULE_DETAILS[modId];
              if (!detail) return null;
              const Icon = detail.icon;
              const isActive = activeModule === modId;
              return (
                <div
                  key={modId}
                  onClick={() => setActiveModule(modId)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all whitespace-nowrap ${
                    isActive
                      ? `bg-blue-50 border-blue-200 text-blue-600 shadow-sm shadow-blue-500/5`
                      : `border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50`
                  }`}
                >
                  <Icon size={12} className={isActive ? "animate-pulse text-blue-650" : "text-slate-400"} />
                  <span>{detail.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeModule(modId);
                    }}
                    className="hover:bg-slate-200 rounded p-0.5 ml-1 transition-colors flex items-center justify-center text-[9px] font-normal"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => setIsDocked(false)}
            className="ml-2.5 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            title="Undock / Float Tabs"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      )}

      {/* Spacer if not docked */}
      {!isDocked && <div className="flex-1" />}

      {/* Right side actions */}
      <div className="flex items-center gap-3 ml-auto flex-shrink-0">
        <button
          onClick={() => setActiveModule("contact")}
          className="flex items-center gap-1.5 text-xs text-slate-650 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium cursor-pointer focus:outline-none"
        >
          <MessageCircle size={14} className="text-slate-400" />
          Contact Us
        </button>

        {/* Custom Theme Toggle Switch */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className={`relative flex items-center justify-between w-28 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 border-none outline-none select-none ${
            resolvedTheme === "dark" ? "bg-[#1f2937]" : "bg-[#e5e7eb]"
          }`}
          title={resolvedTheme === "dark" ? "Switch to Day Mode" : "Switch to Night Mode"}
        >
          {resolvedTheme === "dark" ? (
            <>
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                <Moon size={12} className="text-slate-900 fill-slate-900" />
              </div>
              <span className="text-[9px] font-black tracking-wider text-white pr-2.5">
                NIGHTMODE
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-black tracking-wider text-slate-700 pl-2.5">
                DAYMODE
              </span>
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
                <Sun size={12} className="text-amber-500 fill-amber-500" />
              </div>
            </>
          )}
        </button>

        {user ? null : (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-150">
            <button
              onClick={() => setActiveModule("login")}
              className="text-xs border border-slate-200 text-slate-650 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors font-semibold cursor-pointer focus:outline-none"
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveModule("register")}
              className="text-xs text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-3 py-2 rounded-xl transition-all font-semibold shadow-sm cursor-pointer focus:outline-none"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}