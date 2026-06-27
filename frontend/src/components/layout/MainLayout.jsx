import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";

export default function MainLayout({ children }) {
  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-body" style={{ height: "100vh" }}>
      {/* Sidebar on the Left (Full Height) */}
      <Sidebar />

      {/* Main Workspace Column */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden relative">
        {/* Floating glassmorphism header */}
        <Header />

        {/* Dynamic page content container with standard spacious padding */}
        <main className="flex-grow overflow-y-auto p-8 relative flex flex-col gap-6">
          {children}
        </main>

        {/* Premium thin footer */}
        <footer className="h-11 bg-white border-t border-slate-200 flex items-center justify-center px-8 text-[11px] text-slate-400 flex-shrink-0 z-30 select-none">
          <div>
            © 2026 <span className="font-semibold text-slate-600">Spatial Biologics</span> · Research Platform
          </div>
        </footer>
      </div>

      {/* Right panel panel drawer */}
      <RightPanel />
    </div>
  );
}
