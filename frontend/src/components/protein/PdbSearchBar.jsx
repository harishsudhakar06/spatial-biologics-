import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export default function PdbSearchBar({ onSearch, initialValue = '', initialCSM = false, hideStats = false }) {
  const [query, setQuery] = useState(initialValue);
  const [includeCSM, setIncludeCSM] = useState(initialCSM);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    setIncludeCSM(initialCSM);
  }, [initialCSM]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (query.trim()) onSearch(query.trim(), includeCSM);
  };

  return (
    <div 
      className="w-full flex flex-col lg:flex-row items-center justify-between p-6 lg:p-7 gap-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden animate-fade-in-up"
      style={{
        background: 'linear-gradient(135deg, #0c1e36 0%, #1e3a8a 100%)',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.4)'
      }}
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Stats Section */}
      {!hideStats && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8 z-10">
          <div className="flex items-center gap-3.5">
            <div className="text-left">
              <strong className="block text-2xl font-extrabold text-white tracking-tight leading-none font-head">254,978</strong>
              <span className="text-[10px] text-slate-300 font-medium tracking-wide uppercase mt-1 block leading-tight">
                Structures from<br />the PDB archive
              </span>
            </div>
          </div>

          <div className="hidden sm:block w-px h-10 bg-white/10" />

          <div className="flex items-center gap-3.5">
            <div className="text-left">
              <strong className="block text-2xl font-extrabold text-white tracking-tight leading-none font-head">1,062,058</strong>
              <span className="text-[10px] text-slate-300 font-medium tracking-wide uppercase mt-1 block leading-tight">
                Computed Structure<br />Models (CSM)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search Input and Suggestions Wrapper */}
      <div className="w-full lg:max-w-[620px] flex flex-col gap-3.5 z-10">
        <div className="w-full flex items-center bg-white rounded-2xl p-1.5 shadow-lg border border-slate-200/20 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
          <div className="flex items-center gap-2.5 flex-1 px-3.5">
            <input
              type="text"
              placeholder="Enter search term(s), PDB ID, Ligand ID or sequence..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full text-slate-800 text-sm bg-transparent border-none outline-none placeholder:text-slate-400/80 py-2 font-medium"
            />
          </div>
          
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-650 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none">
            <input
              type="checkbox"
              checked={includeCSM}
              onChange={e => setIncludeCSM(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              style={{ accentColor: '#0d9488' }}
            />
            <span>Include <strong className="text-teal-650 font-bold">CSM</strong></span>
          </label>

          <button 
            onClick={handleSubmit} 
            className="ml-1.5 p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center focus:outline-none"
            title="Search"
          >
            <Search size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Suggestion Pills */}
        <div className="flex items-center gap-2 flex-wrap px-1">
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mr-1">Examples:</span>
          {["hemoglobin", "insulin", "kinase", "1HSG", "2NUD"].map(ex => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                onSearch(ex, includeCSM);
              }}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:outline-none"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
