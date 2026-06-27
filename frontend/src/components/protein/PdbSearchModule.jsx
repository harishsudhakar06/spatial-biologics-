import React, { useState, useEffect, useCallback } from 'react';
import PdbSearchBar from './PdbSearchBar';
import PdbSearchSidebar from './PdbSearchSidebar';
import { searchProteins, fetchStructure, fetchFasta } from '../../services/pdbApi';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { saveFile } from '../../utils/downloadHelper';

const ROWS = 10;
const EMPTY_FILTERS = {
  methodology:[], organism:[], taxonomy:[], experimental_method:[],
  integrative_input:[], polymer_entity_type:[], resolution:[], release_date:[],
  enzyme_class:[], membrane_protein:[], symmetry_type:[], scop_class:[]
};

export default function PdbSearchModule() {
  const { downloadedProteins = [], addDownloadedProtein, removeDownloadedProtein } = useWorkspace();
  const { user } = useAuth();

  const [query, setQuery] = useState('');
  const [includeCSM, setIncludeCSM] = useState(false);
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState({});
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('score');
  const [hasSearched, setHasSearched] = useState(false);

  // Detail Sub-View state
  const [selectedPdbId, setSelectedPdbId] = useState(null);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("recent_pdb_searches");
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
      localStorage.setItem("recent_pdb_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const doSearch = useCallback(async (kw, csm, pg, filt, sb) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchProteins({
        keyword: kw,
        start: pg * ROWS,
        rows: ROWS,
        include_csm: csm,
        sort_by: sb,
        sort_direction: 'desc',
        filters: filt
      });
      const items = data.results || [];
      setResults(items);
      setTotalCount(data.total_count || 0);
      setFacets(data.facets || {});
      setHasSearched(true);
      if (items.length > 0 && kw.trim()) {
        saveRecentSearch(kw);
      }
    } catch (e) {
      const msg = e.message.replace(/uniprot\.org|rcsb\.org|files\.rcsb\.org|rest\.uniprot\.org/gi, 'Protein Database');
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (kw, csm) => {
    setQuery(kw);
    setIncludeCSM(csm);
    setPage(0);
    setFilters(EMPTY_FILTERS);
    doSearch(kw, csm, 0, EMPTY_FILTERS, sortBy);
  };

  const handleFilterChange = (f) => {
    setFilters(f);
    setPage(0);
    doSearch(query, includeCSM, 0, f, sortBy);
  };

  const handleSort = (sb) => {
    setSortBy(sb);
    setPage(0);
    doSearch(query, includeCSM, 0, filters, sb);
  };

  const handlePage = (pg) => {
    setPage(pg);
    doSearch(query, includeCSM, pg, filters, sortBy);
    const container = document.getElementById('pdb-results-top');
    if (container) container.scrollIntoView({ behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalCount / ROWS);
  const pageNums = [];
  let s = Math.max(0, page - 3), e = Math.min(totalPages - 1, s + 6);
  if (e - s < 6) s = Math.max(0, e - 6);
  for (let i = s; i <= e; i++) pageNums.push(i);

  if (selectedPdbId) {
    return (
      <PdbDetailView
        pdbId={selectedPdbId}
        onBack={() => setSelectedPdbId(null)}
        downloadedProteins={downloadedProteins}
        addDownloadedProtein={addDownloadedProtein}
        removeDownloadedProtein={removeDownloadedProtein}
      />
    );
  }

  return (
    <div className="p-4 pdb-search-container" id="pdb-results-top">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-0.5">Protein Search</h2>
        <p className="text-xs text-gray-500">Search protein structures and Computed Structure Models</p>
      </div>

      <PdbSearchBar
        onSearch={handleSearch}
        initialValue={query}
        initialCSM={includeCSM}
        hideStats={hasSearched}
      />

      {loading ? (
        <div className="pdb-loading">
          <div className="pdb-spinner" />
          <div>Searching PDB archive…</div>
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col gap-6 mt-4">
          {recentSearches.length > 0 ? (
            <div className="bg-white border border-slate-200 rounded-[18px] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  Recent Searches
                </h3>
                <button
                  onClick={() => {
                    localStorage.removeItem("recent_pdb_searches");
                    setRecentSearches([]);
                  }}
                  className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer focus:outline-none"
                >
                  Clear History
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentSearches.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleSearch(ex, false)}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium text-left transition-all cursor-pointer focus:outline-none shadow-sm"
                  >
                    <span>{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 rounded-[18px] shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <div className="w-12 h-12 rounded-[18px] bg-slate-50 flex items-center justify-center text-slate-450 mb-4 border border-slate-200">
                🔬
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">No recent protein searches</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5">Enter a keyword (e.g., insulin) in the search bar above to fetch 3D structures from the Protein Data Bank.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="pdb-main-layout">
          <PdbSearchSidebar
            facets={facets}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          <div className="pdb-results-area">
            {error ? (
              <div className="pdb-error-msg">⚠ Error: {error}</div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-3xl mb-2">🔬</div>
                <div className="text-sm font-medium text-gray-600">No PDB structures found</div>
                <div className="text-xs">Try a different search term or PDB ID</div>
              </div>
            ) : (
              <>
                <div className="pdb-results-header">
                  <div className="pdb-results-count">
                    Showing <strong>{page * ROWS + 1}–{Math.min((page + 1) * ROWS, totalCount)}</strong> of{' '}
                    <strong>{totalCount.toLocaleString()}</strong> results for "<strong>{query}</strong>"
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12, color: '#555' }}>Sort by:</label>
                    <select
                      className="pdb-sort-select"
                      value={sortBy}
                      onChange={e => handleSort(e.target.value)}
                    >
                      <option value="score">Relevance</option>
                      <option value="released">Release Date</option>
                      <option value="pdb_id">PDB ID</option>
                    </select>
                  </div>
                </div>

                <table className="pdb-results-table">
                  <thead>
                    <tr>
                      <th className="pdb-col-id">PDB ID</th>
                      <th className="pdb-col-title">Structure Title</th>
                      <th className="pdb-col-released">Released</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.pdb_id} className="pdb-result-row">
                        <td className="pdb-col-id">
                          <span
                            className="pdb-result-pdbid-link"
                            onClick={() => setSelectedPdbId(r.pdb_id)}
                          >
                            {r.pdb_id}
                          </span>
                        </td>
                        <td className="pdb-col-title">
                          <span
                            className="pdb-result-title-link"
                            onClick={() => setSelectedPdbId(r.pdb_id)}
                          >
                            {r.title}
                          </span>
                          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                            {r.organisms && r.organisms.length > 0 && (
                              <span>Organism: {r.organisms.join(', ')}</span>
                            )}
                            {r.macromolecules && r.macromolecules.length > 0 && (
                              <span style={{ marginLeft: 12 }}>Macromolecules: {r.macromolecules.slice(0, 3).join(', ')}</span>
                            )}
                          </div>
                        </td>
                        <td className="pdb-col-released" style={{ fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                          {r.release_date || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="pdb-pagination">
                    <button className="pdb-page-btn" onClick={() => handlePage(0)} disabled={page === 0}>«</button>
                    <button className="pdb-page-btn" onClick={() => handlePage(page - 1)} disabled={page === 0}>‹</button>
                    {pageNums.map(n => (
                      <button
                        key={n}
                        className={`pdb-page-btn${n === page ? ' active' : ''}`}
                        onClick={() => handlePage(n)}
                      >
                        {n + 1}
                      </button>
                    ))}
                    <button className="pdb-page-btn" onClick={() => handlePage(page + 1)} disabled={page >= totalPages - 1}>›</button>
                    <button className="pdb-page-btn" onClick={() => handlePage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/* ─── PDB STRUCTURE DETAIL COMPONENT ────────────────────────────────────────── */
/* ───────────────────────────────────────────────────────────────────────────── */

function PdbDetailView({ pdbId, onBack, downloadedProteins, addDownloadedProtein, removeDownloadedProtein }) {
  const { setActiveModule, setProteinSearchQuery } = useWorkspace();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerChain, setViewerChain] = useState('');
  const [valImgError, setValImgError] = useState(false);

  // Fasta Sequence Modal
  const [fastaOpen, setFastaOpen] = useState(false);
  const [fastaData, setFastaData] = useState(null);
  const [fastaLoading, setFastaLoading] = useState(false);
  const [fastaError, setFastaError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setImgError(false);
    setValImgError(false);
    const cleanId = pdbId.split(':')[0].toUpperCase();
    fetchStructure(cleanId)
      .then(d => setData(d))
      .catch(e => {
        const msg = e.message.replace(/uniprot\.org|rcsb\.org|files\.rcsb\.org|rest\.uniprot\.org/gi, 'Protein Database');
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [pdbId]);

  if (loading) return (
    <div className="p-4 pdb-search-container">
      <button className="pdb-back-btn" onClick={onBack}>← Back to Results</button>
      <div className="pdb-loading">
        <div className="pdb-spinner" />
        <div>Loading structure coordinates & details…</div>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="p-4 pdb-search-container">
      <button className="pdb-back-btn" onClick={onBack}>← Back to Results</button>
      <div className="pdb-error-msg">⚠ Could not load structure details for {pdbId}. Error: {error}</div>
    </div>
  );

  const upper = data.pdb_id;
  const imageUrl = `https://cdn.rcsb.org/images/structures/${upper.toLowerCase()}_assembly-1.jpeg`;
  const doi = `https://doi.org/10.2210/pdb${upper}/pdb`;
  const vs = data.validation || {};
  const symText = `${data.symmetry_type || data.symmetry_kind || 'Asymmetric'} - ${data.symmetry_symbol || 'C1'}`;
  
  const isAlreadyAdded = downloadedProteins.some(p => p.accession === upper && p.format === 'pdb');

  const handleDisplayFasta = async () => {
    setFastaOpen(true);
    setFastaLoading(true);
    setFastaError(null);
    try {
      const text = await fetchFasta(upper);
      setFastaData(text);
    } catch (err) {
      setFastaError('Could not load FASTA sequence.');
    } finally {
      setFastaLoading(false);
    }
  };

  const handleDownloadFasta = async () => {
    if (!fastaData) return;
    await saveFile(fastaData, `${upper}.fasta`, 'FASTA Sequence Files', { 'text/plain': ['.fasta'] });
  };

  const handleDownloadPdbFile = async () => {
    try {
      const response = await fetch(`https://files.rcsb.org/download/${upper}.pdb`);
      if (!response.ok) throw new Error("Fetch failed");
      const text = await response.text();
      await saveFile(text, `${upper}.pdb`, 'PDB Structure Files', { 'text/plain': ['.pdb'] });
    } catch (err) {
      window.open(`https://files.rcsb.org/download/${upper}.pdb`, '_blank');
    }
  };

  const handleToggleWorkspace = () => {
    if (isAlreadyAdded) {
      removeDownloadedProtein(upper + "_pdb");
    } else {
      addDownloadedProtein({
        accession: upper,
        format: 'pdb',
        entryName: upper,
        gene: data.classification || 'N/A',
        organism: (data.organisms || []).join(', ') || 'N/A',
        addedAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="p-4 pdb-search-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="pdb-back-btn" style={{ marginBottom: 0 }} onClick={onBack}>← Back to Results</button>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pdb-detail-btn" onClick={handleDisplayFasta}>📄 FASTA Sequence</button>
          <button className="pdb-detail-btn" onClick={handleDownloadPdbFile}>⬇ Legacy PDB Format</button>
          <button 
            className="pdb-detail-btn"
            style={{
              background: isAlreadyAdded ? '#10b981' : '#f0f6fc',
              color: isAlreadyAdded ? '#fff' : '#1b3a5c',
              borderColor: isAlreadyAdded ? '#10b981' : '#b0c4d8'
            }}
            onClick={handleToggleWorkspace}
          >
            {isAlreadyAdded ? '✓ Added to Project' : '📁 Add to Project'}
          </button>
        </div>
      </div>

      <div className="pdb-detail-layout">
        {/* Left Panel */}
        <div className="pdb-detail-left">
          <div className="pdb-detail-struct-img-wrapper">
            {imgError ? (
              <div className="pdb-detail-struct-img-placeholder">No Structure Image Available</div>
            ) : (
              <img
                className="pdb-detail-struct-img"
                src={imageUrl}
                alt={upper}
                onError={() => setImgError(true)}
              />
            )}
          </div>
          
          <button 
            style={{
              width: '100%', padding: '10px', marginTop: '12px', background: '#1e3a8a',
              color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '13px'
            }}
            onClick={() => setViewerOpen(true)}
          >
            👁 Open 3D Structure Viewer
          </button>

          <div className="pdb-sym-box">
            <strong>Global Symmetry</strong>
            {symText} ⓘ
            <div style={{ marginTop: 6 }}>
              <strong>Global Stoichiometry</strong>
              {data.oligomeric_state && data.oligomeric_state !== 'N/A'
                ? `${data.oligomeric_state} - ${data.stoichiometry}`
                : data.stoichiometry || 'N/A'} ⓘ
            </div>
          </div>

          <div className="pdb-macro-box">
            <h4>📦 Macromolecule Content ⓘ</h4>
            <ul>
              {data.molecular_weight && <li>Total Structure Weight: {Number(data.molecular_weight).toFixed(2)} kDa</li>}
              {data.deposited_atom_count && <li>Atom Count: {data.deposited_atom_count.toLocaleString()}</li>}
              {data.modeled_residue_count && <li>Modeled Residue Count: {data.modeled_residue_count.toLocaleString()}</li>}
              {data.deposited_residue_count && <li>Deposited Residue Count: {data.deposited_residue_count.toLocaleString()}</li>}
              {data.unique_chains && <li>Unique protein chains: {data.unique_chains}</li>}
            </ul>
          </div>
        </div>

        {/* Right Panel */}
        <div className="pdb-detail-right">
          <div className="pdb-detail-pdbid">
            <span className="pdb-icon">🧪</span>
            {upper}
            <span style={{ color: '#aaa', fontWeight: 400, fontSize: 18 }}>|</span>
            <span style={{ fontSize: 15, color: '#888', fontWeight: 400 }}>pdb_{upper.toLowerCase().padStart(8, '0')}</span>
          </div>

          <div className="pdb-detail-title">{data.title}</div>

          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <strong>PDB DOI:</strong> <span style={{ color: '#333' }}>{doi}</span>
          </div>

          <table className="pdb-detail-table">
            <tbody>
              <tr>
                <td>Classification:</td>
                <td>{data.classification && data.classification !== 'N/A' ? data.classification : 'N/A'}</td>
              </tr>
              <tr>
                <td>Organism(s):</td>
                <td>{data.organisms && data.organisms.length > 0 ? data.organisms.join(', ') : 'N/A'}</td>
              </tr>
              {data.expression_systems && data.expression_systems.length > 0 && (
                <tr>
                  <td>Expression System:</td>
                  <td style={{ color: '#2563eb' }}>{data.expression_systems.join(', ')}</td>
                </tr>
              )}
              <tr>
                <td>Mutation(s):</td>
                <td>{data.mutation || 'No'} ⓘ</td>
              </tr>
              <tr>
                <td>Deposition Dates:</td>
                <td>Deposited: {data.deposit_date} &nbsp;|&nbsp; Released: {data.release_date}</td>
              </tr>
              <tr>
                <td>Deposition Author(s):</td>
                <td>{data.authors && data.authors.length > 0 ? data.authors.join(', ') : 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          {/* Validation Metrics */}
          {!valImgError && (
            <div style={{ marginTop: 16 }}>
              <span style={{ fontWeight: 'bold', fontSize: 14, color: '#1b3a5c', display: 'block', marginBottom: 8 }}>Structure Validation Percentiles</span>
              <div style={{ border: '1px solid #dce8f5', borderRadius: 4, padding: 12, background: '#fafcff', maxWidth: 520 }}>
                <img
                  src={`https://www.ebi.ac.uk/pdbe/entry-files/download/${upper.toLowerCase()}_multipercentile_validation.svg`}
                  alt={`Validation Report for ${upper}`}
                  style={{ display: 'block', width: '100%', height: 'auto', minHeight: 80, objectFit: 'contain' }}
                  onError={e => {
                    const pngUrl = `https://www.ebi.ac.uk/pdbe/entry-files/download/${upper.toLowerCase()}_multipercentile_validation.png`;
                    if (e.target.src !== pngUrl) {
                      e.target.src = pngUrl;
                    } else {
                      setValImgError(true);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Ligand Quality assessment */}
          {data.has_ligand && data.ligand_scores && data.ligand_scores.length > 0 && (
            <div style={{ border: '1px solid #dce8f5', borderRadius: 4, padding: 14, background: '#fafcff', maxWidth: 520, marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1b3a5c', display: 'flex', alignItems: 'center', gap: 6 }}>
                Ligand Structure Quality Assessment
                <span title="Goodness of fit of ligand structure to experimental data (RSCC)" style={{ cursor: 'help', color: '#888', fontSize: 14 }}>ⓘ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                <span style={{ fontSize: 12, color: '#555' }}>Worse 0</span>
                <div style={{ flex: 1, position: 'relative', height: 18 }}>
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: 3, height: 12, borderRadius: 2,
                    background: 'linear-gradient(to right, #55efc4 0%, #fdcb6e 50%, #ff7675 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.12)'
                  }}/>
                  {data.ligand_scores.map((ls, lidx) => {
                    const pct = Math.min(Math.max(ls.rscc * 100, 2), 97);
                    return (
                      <div
                        key={lidx}
                        title={`${ls.id} (Instance ${ls.instance_id}): RSCC = ${ls.rscc.toFixed(3)}`}
                        style={{
                          position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)',
                          width: 4, height: 18, background: '#1b3a5c', border: '1px solid #ffffff',
                          borderRadius: 1, zIndex: 2, cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: 12, color: '#555' }}>1 Better</span>
              </div>
              <div style={{ fontSize: 11, color: '#666', textAlign: 'center', display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {data.ligand_scores.map((ls, lidx) => (
                  <span key={lidx} style={{ fontWeight: 700, color: '#1b3a5c', background: '#e8f0fa', padding: '1px 5px', borderRadius: 3 }}>
                    {ls.id}-{ls.instance_id}: {ls.rscc.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Macromolecules Table */}
      {data.macromolecules && data.macromolecules.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: '#4a5568', color: '#fff', padding: '8px 14px', borderRadius: '4px 4px 0 0', fontWeight: 700, fontSize: 14 }}>
            Macromolecules
          </div>
          <div style={{ border: '1px solid #dce8f5', borderTop: 'none', borderRadius: '0 0 4px 4px', background: '#fff' }}>
            {data.macromolecules.map((mac, idx) => (
              <div key={idx} style={{ borderBottom: idx < data.macromolecules.length - 1 ? '1px solid #eef2f7' : 'none' }}>
                <div style={{ background: '#eaf2fb', padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#1b3a5c' }}>
                  Entity ID: {mac.entity_id || idx + 1}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dce8f5' }}>
                      {['Molecule', 'Chains', 'Sequence Length', 'Organism', 'Details', 'Image'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#222', background: '#f7fafd' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', maxWidth: 200 }}>{mac.molecule || 'N/A'}</td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top', fontWeight: 600 }}>
                        {mac.chains && mac.chains.join(', ')}
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{mac.sequence_length ?? 'N/A'}</td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{mac.organism || 'N/A'}</td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>Mutation(s): {mac.mutation_count}</td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                        {mac.chains && mac.chains.length > 0 && (
                          <img
                            src={`https://cdn.rcsb.org/images/structures/${upper.toLowerCase()}_chain-${mac.chains[0]}.jpeg`}
                            alt={`chain ${mac.chains[0]}`}
                            style={{ width: 72, height: 72, objectFit: 'contain', display: 'block' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {mac.uniprot_ids && mac.uniprot_ids.length > 0 && (
                  <div style={{ background: '#f7fafd', borderTop: '1px solid #eef2f7', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1b3a5c' }}>Protein Library</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {mac.uniprot_ids.map(uid => (
                        <span 
                          key={uid} 
                          style={{ 
                            background: '#1b3a5c', 
                            color: '#fff', 
                            borderRadius: 3, 
                            padding: '2px 8px', 
                            fontWeight: 700, 
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.target.style.background = '#2563eb'}
                          onMouseLeave={e => e.target.style.background = '#1b3a5c'}
                          onClick={() => {
                            setProteinSearchQuery(uid);
                            setActiveModule("protein");
                          }}
                        >
                          {uid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Small Molecules Table */}
      {((data.modified_residues && data.modified_residues.length > 0) || (data.small_molecules && data.small_molecules.length > 0)) && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: '#4a5568', color: '#fff', padding: '8px 14px', borderRadius: '4px 4px 0 0', fontWeight: 700, fontSize: 14 }}>
            Small Molecules
          </div>
          <div style={{ border: '1px solid #dce8f5', borderTop: 'none', borderRadius: '0 0 4px 4px', background: '#fff', paddingBottom: 8 }}>
            
            {/* Modified residues */}
            {data.modified_residues && data.modified_residues.length > 0 && (
              <div style={{ borderBottom: (data.small_molecules && data.small_molecules.length > 0) ? '1px solid #dce8f5' : 'none', paddingBottom: 12 }}>
                <div style={{ padding: '10px 16px 6px', fontWeight: 700, fontSize: 13 }}>Modified Residues ⓘ</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #dce8f5', borderTop: '1px solid #dce8f5' }}>
                      {['ID', 'Chains', 'Type', 'Formula', '2D Diagram', 'Parent'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#222', background: '#f7fafd' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.modified_residues.map((sm, si) => (
                      <tr key={si} style={{ borderBottom: '1px solid #f0f4f8' }}>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top', fontWeight: 700 }}>{sm.id}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{sm.chains && sm.chains.join(', ')}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{sm.type}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top', fontFamily: 'monospace' }}>{sm.formula || 'N/A'}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                          <img
                            src={sm.diagram_url}
                            alt={sm.id}
                            style={{ width: 100, height: 80, objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{sm.parent || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ligands */}
            {data.small_molecules && data.small_molecules.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ padding: '10px 16px 6px', fontWeight: 700, fontSize: 13 }}>Ligands</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #dce8f5', borderTop: '1px solid #dce8f5' }}>
                      {['ID', 'Chains', 'Type', 'Formula', '2D Diagram'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#222', background: '#f7fafd' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.small_molecules.map((sm, si) => (
                      <tr key={si} style={{ borderBottom: '1px solid #f0f4f8' }}>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top', fontWeight: 700 }}>{sm.id}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{sm.chains && sm.chains.join(', ')}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>{sm.type}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top', fontFamily: 'monospace' }}>{sm.formula || 'N/A'}</td>
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                          <img
                            src={sm.diagram_url}
                            alt={sm.id}
                            style={{ width: 100, height: 80, objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Experimental Details */}
      <div style={{ marginTop: 24, marginBottom: 32 }}>
        <div style={{ background: '#4a5568', color: '#fff', padding: '8px 14px', borderRadius: '4px 4px 0 0', fontWeight: 700, fontSize: 14 }}>
          Experimental Data &amp; Validation
        </div>
        <div style={{ border: '1px solid #dce8f5', borderTop: 'none', borderRadius: '0 0 4px 4px', background: '#fff', padding: '20px' }}>
          <table style={{ fontSize: 13, borderCollapse: 'collapse', lineHeight: 2 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, paddingRight: 14 }}>Method:</td>
                <td>{data.method || 'N/A'}</td>
              </tr>
              {data.conformer_count && (
                <tr>
                  <td style={{ fontWeight: 700, paddingRight: 14 }}>Conformers:</td>
                  <td>{data.conformer_count}</td>
                </tr>
              )}
              {data.resolution && (
                <tr>
                  <td style={{ fontWeight: 700, paddingRight: 14 }}>Resolution:</td>
                  <td>{data.resolution}</td>
                </tr>
              )}
              {data.r_free !== null && (
                <tr>
                  <td style={{ fontWeight: 700, paddingRight: 14 }}>R-Value Free:</td>
                  <td>{data.r_free} (Depositor) {vs.dcc_rfree !== null && `| ${vs.dcc_rfree} (DCC)`}</td>
                </tr>
              )}
              {data.r_work !== null && (
                <tr>
                  <td style={{ fontWeight: 700, paddingRight: 14 }}>R-Value Work:</td>
                  <td>{data.r_work} (Depositor) {vs.dcc_r !== null && `| ${vs.dcc_r} (DCC)`}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3D Molstar Modal */}
      {viewerOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}
          onClick={() => setViewerOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#fff', borderRadius: '8px', width: '95%',
              maxWidth: '1100px', height: '85vh', display: 'flex',
              flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: '#1b3a5c', color: '#fff' }}>
              <h3 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>3D Structure Viewer - {upper}</h3>
              <button onClick={() => setViewerOpen(false)} style={{ border: 'none', background: 'transparent', color: '#fff', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ flex: 1, background: '#f8fbff', position: 'relative' }}>
              <iframe 
                src={`https://molstar.org/viewer/?pdb=${upper}`}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                title={`3D Molstar Viewer for ${upper}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* FASTA Modal */}
      {fastaOpen && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}
          onClick={() => setFastaOpen(false)}
        >
          <div 
            style={{
              backgroundColor: '#fff', borderRadius: 8, width: '90%', maxWidth: '650px',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  onClick={handleDownloadFasta}
                  disabled={!fastaData}
                >
                  ⬇ Download FASTA
                </button>
                <button 
                  style={{
                    padding: '6px 12px',
                    background: isAlreadyAdded ? '#10b981' : '#f0f6fc',
                    color: isAlreadyAdded ? '#fff' : '#1b3a5c',
                    border: '1.5px solid',
                    borderColor: isAlreadyAdded ? '#10b981' : '#b0c4d8',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600
                  }}
                  onClick={handleToggleWorkspace}
                >
                  {isAlreadyAdded ? '✓ Added to Project' : '📁 Add to Project'}
                </button>
              </div>
              <h3 style={{ fontSize: '14px', margin: 0, color: '#2d3748' }}>FASTA Sequence: {upper}</h3>
              <button style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#718096' }} onClick={() => setFastaOpen(false)}>&times;</button>
            </div>
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f8fbff', color: '#1b3a5c', lineHeight: 1.6 }}>
              {fastaLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading sequence content...</div>
              ) : fastaError ? (
                <div style={{ color: '#e53e3e' }}>{fastaError}</div>
              ) : (
                fastaData
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
