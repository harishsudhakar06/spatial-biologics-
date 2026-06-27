import React, { useState } from "react";
import { searchLigands } from "../services/ligandApi";
import CompoundCard from "../components/CompoundCard";
import SummaryModal from "../components/SummaryModal";
import SimilarModal from "../components/SimilarModal";
import StructureModal from "../components/StructureModal";
import DescriptionPage from "../components/DescriptionPage";

// Shared UI components
import ModuleHeader from "../components/ui/ModuleHeader";
import SearchBar from "../components/ui/SearchBar";
import { Card, CardBody } from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import { SkeletonTable } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { 
  FlaskConical, Database, Activity, Users, Edit3, Folder, 
  Box, FileText, BarChart2, ArrowRight, Clock, AlertCircle, Search 
} from "lucide-react";

export default function ChemVaultDashboard() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [summaryCid, setSummaryCid] = useState(null);
  const [similarCid, setSimilarCid] = useState(null);
  const [structureData, setStructureData] = useState(null);
  const [descriptionCompound, setDescriptionCompound] = useState(null);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("recent_ligand_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (queryStr) => {
    const trimmed = queryStr.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem("recent_ligand_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = async (forcedQuery) => {
    const q = (typeof forcedQuery === "string" ? forcedQuery : query).trim();
    if (!q) return;
    try {
      setLoading(true);
      setSearched(true);
      setError("");
      const response = await searchLigands(q);
      const items = response.data.results || [];
      setResults(items);
      if (items.length > 0) {
        saveRecentSearch(q);
      }
    } catch (err) {
      console.log(err);
      setError("Failed to fetch ligands. Please check your network connection or try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setError("");
  };

  if (descriptionCompound) {
    return (
      <DescriptionPage
        compound={descriptionCompound}
        onBack={() => setDescriptionCompound(null)}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Module Header */}
      <ModuleHeader
        title="Ligand Database"
        description="Search, extract, and analyze chemical compounds in our comprehensive molecular database."
        icon={FlaskConical}
      />

      {/* Modern Glassmorphic Search Area */}
      <div className="w-full">
        <SearchBar
          placeholder="Search Aspirin, Curcumin, Ibuprofen, Paracetamol..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          loading={loading}
          buttonText="Search Database"
          suggestions={["Aspirin", "Curcumin", "Ibuprofen", "Paracetamol"]}
          onSuggestionClick={(sug) => {
            setQuery(sug);
            handleSearch(sug);
          }}
          suggestionLabel="Suggestions:"
        />
      </div>

      {/* Loading Skeleton state */}
      {loading && (
        <Card hover={false} className="p-6">
          <div className="text-sm font-semibold text-slate-700 mb-4 animate-pulse">
            Querying database...
          </div>
          <SkeletonTable rows={4} cols={5} />
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Search Error</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Results View */}
      {!loading && searched && results.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500 font-medium">
              Found <span className="font-semibold text-slate-800">{results.length}</span> compounds
            </div>
            <button
              onClick={handleClearSearch}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer focus:outline-none"
            >
              Clear Search
            </button>
          </div>

          <div className="space-y-4">
            {results.map((compound, index) => (
              <CompoundCard
                key={compound.cid}
                compound={compound}
                index={index + 1}
                isBest={index === 0}
                onSummary={() => setSummaryCid(compound.cid)}
                onDescription={() => setDescriptionCompound(compound)}
                onSimilar={() => setSimilarCid(compound.cid)}
                onStructure={(type) =>
                  setStructureData({
                    cid: compound.cid,
                    type,
                    name: compound.name
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State / Not Found */}
      {!loading && searched && results.length === 0 && !error && (
        <EmptyState
          title="No Compounds Found"
          description={`We couldn't find any chemical compounds matching "${query}". Please check the spelling or try searching another database symbol.`}
          icon={Search}
          action={{
            label: "Search Again",
            onClick: handleClearSearch
          }}
        />
      )}

      {/* Default Dashboard landing view */}
      {!searched && !loading && (
        <div className="flex flex-col gap-6">
          {recentSearches.length > 0 ? (
            <Card hover={false} className="shadow-sm border border-slate-100 rounded-2xl bg-white">
              <CardBody className="p-5">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" /> Recent Searches
                  </h3>
                  <button
                    onClick={() => {
                      localStorage.removeItem("recent_ligand_searches");
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer focus:outline-none"
                  >
                    Clear History
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recentSearches.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(item);
                        handleSearch(item);
                      }}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium text-left transition-all cursor-pointer focus:outline-none shadow-sm hover:-translate-y-0.5 active:scale-[0.99]"
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Search size={13} className="text-slate-400" />
                        <span className="truncate">{item}</span>
                      </span>
                      <ArrowRight size={12} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : (
            <EmptyState
              title="No recent ligand searches"
              description="Enter a chemical name or CID in the search bar above to fetch molecular details."
              icon={FlaskConical}
            />
          )}
        </div>
      )}

      {/* Modals & Popups */}
      {summaryCid && (
        <SummaryModal
          cid={summaryCid}
          onClose={() => setSummaryCid(null)}
        />
      )}

      {summaryCid && (
        <SummaryModal
          cid={summaryCid}
          onClose={() => setSummaryCid(null)}
        />
      )}

      {similarCid && (
        <SimilarModal
          cid={similarCid}
          onClose={() => setSimilarCid(null)}
          onStructure={(cid, type) =>
            setStructureData({
              cid,
              type,
              name: "Compound"
            })
          }
        />
      )}

      {structureData && (
        <StructureModal
          cid={structureData.cid}
          type={structureData.type}
          name={structureData.name}
          onClose={() => setStructureData(null)}
        />
      )}
    </div>
  );
}