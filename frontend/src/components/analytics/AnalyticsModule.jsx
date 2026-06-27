import React from "react";
import { BarChart2 } from "lucide-react";

const ANALYTICS_TOOLS = [
  { name: "PCA", desc: "Principal Component Analysis" },
  { name: "RMSD", desc: "Root Mean Square Deviation" },
  { name: "RMSF", desc: "Root Mean Square Fluctuation" },
  { name: "FEL", desc: "Free Energy Landscape" },
  { name: "MD Analysis", desc: "Molecular Dynamics Analysis" },
  { name: "Clustering", desc: "Conformational Clustering" },
  { name: "Hydrogen Bond", desc: "H-Bond Analysis" },
  { name: "MM-PBSA", desc: "Binding Free Energy" },
];

export default function AnalyticsModule() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-0.5">Analytics</h2>
        <p className="text-xs text-gray-500">Analyze molecular dynamics and simulation results</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ANALYTICS_TOOLS.map(tool => (
          <div
            key={tool.name}
            className="border border-gray-200 rounded-md p-3 bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={14} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-800">{tool.name}</span>
            </div>
            <p className="text-xs text-gray-400">{tool.desc}</p>
            <div className="mt-2">
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Coming soon</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}