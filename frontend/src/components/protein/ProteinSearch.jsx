import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Dna, Database, AlertCircle, Sparkles } from "lucide-react";
import ProteinTable from "./ProteinTable";
import ProteinFilters from "./ProteinFilters";
import ProteinDetails from "./ProteinDetails";
import { searchProteins } from "../../services/proteinApi";
import { useWorkspace } from "../../context/WorkspaceContext";

// Shared UI components
import ModuleHeader from "../ui/ModuleHeader";
import SearchBar from "../ui/SearchBar";
import { Card, CardBody } from "../ui/Card";
import { SkeletonTable } from "../ui/Skeleton";
import EmptyState from "../ui/EmptyState";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const EXAMPLES = ["insulin", "p53", "kinase", "collagen", "BRCA1"];
const PAGE_SIZE = 5;
const MAX_DISPLAY = 2500000;

const isAccession = (q) => {
  const trimmed = q.trim();
  const isAcc = /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(trimmed);
  const isEntryName = /^[A-Z0-9]{1,12}_[A-Z0-9]{1,12}$/i.test(trimmed);
  return isAcc || isEntryName;
};

function StatusModal({ query, onChoose, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-100 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-slide-in relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors focus:outline-none"
        >
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
          <Dna size={22} className="animate-pulse" />
        </div>

        <h3 className="text-base font-semibold text-slate-950 text-center mb-1">
          Choose Entry Type
        </h3>
        <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
          Select what type of search entries to retrieve for <span className="font-semibold text-slate-800">"{query}"</span>.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onChoose("reviewed")}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer"
          >
            Reviewed
          </button>
          <button
            onClick={() => onChoose("unreviewed")}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-sm focus:outline-none cursor-pointer"
          >
            Unreviewed
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProteinSearch() {
  const { addDownloadedProtein, downloadedProteins } = useWorkspace();
  const [query, setQuery] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const [proteins, setProteins] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [cappedWarning, setCappedWarning] = useState(false);

  const [filters, setFilters] = useState(() => {
    try {
      const savedStatus = localStorage.getItem("protein_search_status");
      return {
        status: savedStatus === "unreviewed" ? "unreviewed" : "reviewed",
        organism: "all",
      };
    } catch {
      return { status: "reviewed", organism: "all" };
    }
  });

  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedProtein, setSelectedProtein] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");

  const doSearch = async (searchQuery, activeFilters, cursor = null, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      setCappedWarning(false);

      const isAcc = isAccession(searchQuery);
      let queryStatus = activeFilters.status;
      if (isAcc) queryStatus = "any";

      const res = await searchProteins({
        query: searchQuery,
        status: queryStatus,
        organism: activeFilters.organism,
        size: PAGE_SIZE,
        cursor: cursor
      });

      const { results: newItems, nextCursor: newCursor, total: totalCount } = res.data;

      if (totalCount > MAX_DISPLAY) {
        setCappedWarning(true);
      }

      setTotal(totalCount);
      setProteins(prev => append ? [...prev, ...newItems] : newItems);
      setNextCursor(newCursor);
      setHasMore(!!newCursor);
      setSearched(true);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch protein details. Please refine your query or try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (isAccession(q)) {
      setCurrentQuery(q);
      setProteins([]);
      setNextCursor(null);
      setHasMore(false);
      setSelectedProtein(null);
      doSearch(q, { status: "any", organism: "all" }, null, false);
      return;
    }

    setPendingQuery(q);
    setShowModal(true);
  };

  const handleModalChoose = (status) => {
    setShowModal(false);
    localStorage.setItem("protein_search_status", status);
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    setCurrentQuery(pendingQuery);
    setProteins([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedProtein(null);
    doSearch(pendingQuery, newFilters, null, false);
  };

  const handleStatusChange = (status) => {
    localStorage.setItem("protein_search_status", status);
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    if (currentQuery) {
      setProteins([]);
      setNextCursor(null);
      setHasMore(false);
      doSearch(currentQuery, newFilters, null, false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    if (currentQuery) {
      setProteins([]);
      setNextCursor(null);
      setHasMore(false);
      doSearch(currentQuery, newFilters, null, false);
    }
  };

  const handleExample = (ex) => {
    setQuery(ex);
    setPendingQuery(ex);
    setShowModal(true);
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      doSearch(currentQuery, filters, nextCursor, true);
    }
  };

  if (selectedProtein) {
    return (
      <ProteinDetails
        protein={selectedProtein}
        onBack={() => setSelectedProtein(null)}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {showModal && (
        <StatusModal
          query={pendingQuery}
          onChoose={handleModalChoose}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Module Header */}
      <ModuleHeader
        title="Protein Library"
        description="Explore protein sequences, evolutionary constraints, structural properties, and annotations."
        icon={Dna}
      />

      {/* Modern Search bar */}
      <div className="w-full">
        <SearchBar
          placeholder="Search proteins, genes, organisms… or enter Accession ID (e.g. P01308)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearchSubmit}
          loading={loading}
          buttonText="Query Library"
          suggestions={["insulin", "p53", "kinase", "collagen", "BRCA1", "P01308", "P04637", "P38398"]}
          onSuggestionClick={handleExample}
          suggestionLabel="Examples:"
        />
      </div>      {/* Tip Box */}
      {!searched && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm max-w-2xl">
          <Sparkles className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">Tip:</span> Enter a protein Accession ID (e.g., <code className="bg-blue-100/60 px-1 py-0.5 rounded font-mono">P01308</code>, <code className="bg-blue-100/60 px-1 py-0.5 rounded font-mono">Q9Y6K9</code>) to bypass options and perform an instant, single-record lookup.
          </p>
        </div>
      )}

      {/* Error View */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Search Failed</h4>
            <p className="text-xs text-red-705 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Warning View */}
      {cappedWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-805 text-xs shadow-sm">
          <AlertCircle className="text-amber-505 flex-shrink-0" size={16} />
          <span>
            This query returned more than 2,500,000 results. Review your search parameters or enter a more specific query for refined results.
          </span>
        </div>
      )}

      {/* Page Content layout */}
      {searched && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Filters Sidebar panel */}
          <Card hover={false} className="w-full lg:w-60 flex-shrink-0 p-5">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Filter Options</h3>
            <ProteinFilters
              filters={filters}
              onChange={handleFilterChange}
              hideStatus={true}
            />
          </Card>

          {/* Results table panel */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
            {loading ? (
              <Card hover={false} className="p-6">
                <div className="text-sm font-semibold text-slate-700 mb-4 animate-pulse">
                  Querying database...
                </div>
                <SkeletonTable rows={5} cols={4} />
              </Card>
            ) : proteins.length === 0 && !error ? (
              <EmptyState
                title="No Protein Entries Found"
                description={`We couldn't find any entries matching "${currentQuery}". Try modifying your search term or checking your accession ID.`}
                icon={Search}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-semibold text-slate-800">{proteins.length}</span> of{" "}
                    <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> entries for{" "}
                    <span className="font-semibold text-slate-800">"{currentQuery}"</span>
                    {isAccession(currentQuery) ? (
                      <Badge variant="success" className="ml-2.5">
                        Accession Lookup
                      </Badge>
                    ) : (
                      <Badge variant={filters.status === "reviewed" ? "success" : "slate"} className="ml-2.5">
                        {filters.status}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Protein List Table */}
                <div className="w-full">
                  <ProteinTable proteins={proteins} onSelect={setSelectedProtein} />
                </div>

                {/* Pagination / Load More */}
                {hasMore && (
                  <div className="text-center mt-2">
                    {loadingMore ? (
                      <div className="flex gap-2 items-center justify-center py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    ) : (
                      <Button
                        onClick={handleLoadMore}
                        variant="secondary"
                        size="sm"
                        className="w-full max-w-[200px]"
                      >
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Initial Landing view */}
      {!searched && !loading && (
        <div className="flex flex-col gap-6">
          {downloadedProteins && downloadedProteins.length > 0 ? (
            <Card hover={false} className="shadow-sm border border-slate-100 rounded-2xl bg-white">
              <CardBody className="p-5">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                    <Dna size={13} className="text-slate-450" /> Saved Proteins (Last 5)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {downloadedProteins.slice(-5).reverse().map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                    >
                      <span className="font-semibold">{p.accession}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{p.format}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : (
            <EmptyState
              title="No saved proteins"
              description="Find and save protein records to build your local research library."
              icon={Dna}
            />
          )}
        </div>
      )}
    </div>
  );
}