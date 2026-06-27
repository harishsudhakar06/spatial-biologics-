import React from "react";

const ORGANISMS = [
  { value: "all", label: "All" },
  { value: "human", label: "Human" },
  { value: "mouse", label: "Mouse" },
  { value: "rat", label: "Rat" },
  { value: "bacteria", label: "Bacteria" },
  { value: "plants", label: "Plants" },
  { value: "yeast", label: "Yeast" },
  { value: "zebrafish", label: "Zebrafish" },
];

export default function ProteinFilters({ filters, onChange }) {
  const handleClearFilters = () => {
    onChange({
      status: filters.status,
      organism: "all",
    });
  };

  return (
    <div className="w-[180px] min-w-[180px] flex-shrink-0 bg-white border border-gray-200 rounded-md p-3 h-fit">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Protein Filters
      </div>

      {/* Organism Filter */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-gray-600 mb-2">Organism</div>
        <div className="space-y-1">
          {ORGANISMS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="organism"
                value={opt.value}
                checked={filters.organism === opt.value}
                onChange={() => onChange({ ...filters, organism: opt.value })}
                className="accent-blue-600"
              />
              <span className="text-xs text-gray-600">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={handleClearFilters}
        className="w-full mt-4 text-xs border border-gray-200 rounded py-1.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600 font-medium"
      >
        Clear Filters
      </button>
    </div>
  );
}