import React from "react";
import { Search } from "lucide-react";

export default function SearchBar({
  placeholder = "Search...",
  value,
  onChange,
  onSearch,
  loading = false,
  className = "",
  buttonText = "Search",
  suggestions = [],
  onSuggestionClick,
  suggestionLabel = "Examples:",
  stats = [], // Optional stats array, e.g. [{ value: "254,978", label: "Structures from\nthe PDB archive", emoji: "🧪" }]
  children, // Custom extra controls
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  return (
    <div 
      className={`w-full flex flex-col lg:flex-row items-center justify-between p-6 lg:p-7 gap-6 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden animate-fade-in-up ${className}`}
      style={{
        background: 'linear-gradient(135deg, #0c1e36 0%, #1e3a8a 100%)',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.4)'
      }}
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Optional Stats Section */}
      {stats && stats.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:gap-8 z-10">
          {stats.map((stat, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center gap-3.5 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white shadow-inner">
                  {stat.emoji || "🧪"}
                </div>
                <div className="text-left">
                  <strong className="block text-2xl font-extrabold text-white tracking-tight leading-none font-head">
                    {stat.value}
                  </strong>
                  <span className="text-[10px] text-slate-300 font-medium tracking-wide uppercase mt-1 block leading-tight">
                    {stat.label.split('\n').map((line, lIdx) => (
                      <React.Fragment key={lIdx}>
                        {line}
                        {lIdx < stat.label.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              </div>
              {idx < stats.length - 1 && (
                <div className="hidden sm:block w-px h-10 bg-white/10" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search Input and Suggestions Wrapper */}
      <div className="w-full lg:max-w-[620px] flex flex-col gap-3.5 z-10">
        <div className="w-full flex items-center bg-white rounded-2xl p-1.5 shadow-lg border border-slate-200/20 focus-within:ring-2 focus-within:ring-teal-500/50 transition-all">
          <div className="flex items-center gap-2.5 flex-1 px-3.5">
            <input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              className="w-full text-slate-800 text-sm bg-transparent border-none outline-none placeholder:text-slate-400/80 py-2 font-medium"
            />
          </div>

          {children}

          <button 
            onClick={onSearch}
            disabled={loading}
            className="ml-1.5 p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center focus:outline-none disabled:opacity-50"
            title={buttonText}
          >
            <Search size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Suggestion Pills */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-1">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mr-1">
              {suggestionLabel}
            </span>
            {suggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => onSuggestionClick && onSuggestionClick(sug)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer focus:outline-none"
              >
                {sug}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

