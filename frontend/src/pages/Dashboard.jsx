import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import CompoundCard from "../components/CompoundCard";
import StructureModal from "../components/StructureModal";
import SummaryModal from "../components/SummaryModal";
import SimilarModal from "../components/SimilarModal";
import DescriptionPage from "../components/DescriptionPage";

export default function Dashboard({ user, setUser }) {
  const [query, setQuery] = useState("");
  const [best, setBest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [modal, setModal] = useState(null);
  const [summaryModal, setSummaryModal] = useState(null);
  const [similarModal, setSimilarModal] = useState(null);
  const [descPage, setDescPage] = useState(null);
  const [cacheCount, setCacheCount] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    api.get("/cache-stats")
      .then(r => setCacheCount(r.data.cachedCompounds))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await api.post("/logout");
    setUser(null);
    nav("/login");
  };

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);
    setBest(null);
    setResults([]);
    setDescPage(null);
    setTotalResults(0);
    try {
      const r = await api.get(
        `/search?q=${encodeURIComponent(query.trim())}`
      );
      setBest(r.data.best);
      setResults(r.data.results || []);
      const total = (r.data.best ? 1 : 0) + (r.data.results?.length || 0);
      setTotalResults(total);
      try {
        const c = await api.get("/cache-stats");
        setCacheCount(c.data.cachedCompounds);
      } catch {}
    } catch (err) {
      setError(err.response?.data?.error || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (descPage) {
    return (
      <div className="dash-wrap">
        <nav className="topbar">
          <div className="topbar-left">
            <div className="topbar-brand">ChemVault</div>
            <div className="topbar-tagline">Chemical Compound Database</div>
          </div>
          <div className="topbar-right">
            <div className="user-chip">👤 {user.name}</div>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>
        </nav>
        <DescriptionPage compound={descPage} onBack={() => setDescPage(null)} />
      </div>
    );
  }

  return (
    <div className="dash-wrap">
      <nav className="topbar">
        <div className="topbar-left">
          <div className="topbar-brand">ChemVault</div>
          <div className="topbar-tagline">Chemical Compound Database</div>
        </div>
        <div className="topbar-right">
          {cacheCount !== null && (
            <div className="cache-badge" title="Compounds saved in local cache">
              💾 {cacheCount} cached
            </div>
          )}
          <div className="user-chip">👤 {user.name}</div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-inner">
          <h1 className="hero-title">Search Chemical Compounds</h1>
          <p className="hero-sub">
            Search by compound name or CID — access structures, properties, synonyms and more
          </p>
          <form onSubmit={search} className="hero-search-form">
            <div className="hero-search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Enter compound name or CID (e.g. Aspirin, Curcumin, 2244…)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="hero-input"
              />
              <button className="hero-btn" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          <div className="quick-links">
            <span className="quick-label">Popular searches:</span>
            {[
              ["Aspirin","Aspirin"],
              ["Curcumin","Curcumin"],
              ["Caffeine","Caffeine"],
              ["Ibuprofen","Ibuprofen"],
              ["Quercetin","Quercetin"],
              ["2244","CID 2244"],
              ["969516","CID 969516"],
            ].map(([val, label]) => (
              <button
                key={val}
                className="quick-link-btn"
                onClick={() => {
                  setQuery(val);
                  setTimeout(() => document.querySelector(".hero-btn")?.click(), 100);
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!searched && (
        <div className="info-bar">
          <div className="info-cards">
            <div className="info-card">
              <div className="info-card-icon">🧪</div>
              <div className="info-card-text">
                <div className="info-card-title">Name Search</div>
                <div className="info-card-desc">Search any compound by its common name, IUPAC name, or synonym</div>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">🔢</div>
              <div className="info-card-text">
                <div className="info-card-title">CID Search</div>
                <div className="info-card-desc">Enter a CID number directly for exact compound lookup</div>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">📊</div>
              <div className="info-card-text">
                <div className="info-card-title">Full Data</div>
                <div className="info-card-desc">Structure, properties, synonyms, descriptions and download options</div>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-icon">💾</div>
              <div className="info-card-text">
                <div className="info-card-title">Local Cache</div>
                <div className="info-card-desc">Previously searched compounds load instantly from local storage</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="results-section">
        {loading && (
          <div className="loading-grid">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        )}

        {error && !best && !loading && (
          <div className="err-msg" style={{maxWidth:"700px", margin:"1rem auto"}}>
            {error}
          </div>
        )}

        {!loading && searched && totalResults > 0 && (
          <div className="results-count-bar">
            <span>
              Showing <strong>{totalResults}</strong> result{totalResults > 1 ? "s" : ""} for
              <strong> "{query}"</strong>
            </span>
            <span className="results-source">Source: Chemical Database</span>
          </div>
        )}

        {!loading && best && (
          <div style={{marginBottom:"1.5rem"}}>
            <div className="best-label">BEST COMPOUND MATCH</div>
            <div className="results-grid">
              <CompoundCard
                compound={best}
                isBest={true}
                onStructure={(type) => setModal({ cid: best.cid, type, name: best.name })}
                onSummary={() => setSummaryModal(best.cid)}
                onSimilar={() => setSimilarModal(best.cid)}
                onDescription={() => setDescPage(best)}
              />
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <div className="results-label">
              All results — {results.length + (best ? 1 : 0)} compounds matched
            </div>
            <div className="results-grid">
              {results.map((c, i) => (
                <CompoundCard
                  key={c.cid}
                  compound={c}
                  index={i + 2}
                  onStructure={(type) => setModal({ cid: c.cid, type, name: c.name })}
                  onSummary={() => setSummaryModal(c.cid)}
                  onSimilar={() => setSimilarModal(c.cid)}
                  onDescription={() => setDescPage(c)}
                />
              ))}
            </div>
          </div>
        )}

        {searched && !loading && !best && results.length === 0 && !error && (
          <div className="no-results">
            <div style={{fontSize:"2.5rem", marginBottom:"0.8rem"}}>🔬</div>
            <div style={{fontWeight:600, marginBottom:"0.3rem"}}>No compounds found</div>
            <div style={{color:"var(--muted)", fontSize:"0.82rem"}}>
              Try searching for a different name or a valid PubChem CID number
            </div>
          </div>
        )}
      </div>

      {modal && (
        <StructureModal
          cid={modal.cid}
          type={modal.type}
          name={modal.name}
          onClose={() => setModal(null)}
        />
      )}
      {summaryModal && (
        <SummaryModal cid={summaryModal} onClose={() => setSummaryModal(null)} />
      )}
      {similarModal && (
        <SimilarModal
          cid={similarModal}
          onStructure={(cid, type) => {
            setSimilarModal(null);
            setModal({ cid, type, name: "CID " + cid });
          }}
          onClose={() => setSimilarModal(null)}
        />
      )}
    </div>
  );
}