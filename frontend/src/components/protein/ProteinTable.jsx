import React, { useState } from "react";
import { saveFile } from "../../utils/downloadHelper";
import { CheckCircle, Circle, Download, BookmarkPlus, X, Eye, FileText, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";

// Shared UI components
import { Card, CardBody } from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { 
  TableContainer, Table, TableHeader, 
  TableBody, TableRow, TableCell 
} from "../ui/Table";

export default function ProteinTable({ proteins, onSelect }) {
  const { addDownloadedProtein } = useWorkspace();
  const { user } = useAuth();
  const [selected, setSelected] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [showFmt, setShowFmt] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAddFmt, setShowAddFmt] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const toggleOne = (e, accession) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(accession) ? next.delete(accession) : next.add(accession);
      return next;
    });
    setPreview(null);
  };

  const toggleAll = (e) => {
    e.stopPropagation();
    setSelected(prev =>
      prev.size === proteins.length
        ? new Set()
        : new Set(proteins.map(p => p.accession))
    );
    setPreview(null);
  };

  const fetchContent = async (fmt) => {
    if (selected.size === 0) return null;
    const ids = Array.from(selected).join(",");
    const res = await fetch(`/api/proteins/download?accessions=${ids}&format=${fmt}`);
    if (!res.ok) throw new Error("Failed to fetch");
    return await res.text();
  };

  const handleDownload = async (fmt) => {
    setShowFmt(false);
    if (selected.size === 0) return;
    setDownloading(true);
    try {
      const text = await fetchContent(fmt);
      const ext = fmt === "fasta" ? "fasta" : "txt";
      const suggested = `proteins_${Array.from(selected).slice(0, 3).join("_")}.${ext}`;
      const fileDesc = fmt === "fasta" ? 'FASTA Sequence Files' : 'Protein Text Files';
      const acceptMap = fmt === "fasta" ? { 'text/plain': ['.fasta'] } : { 'text/plain': ['.txt'] };
      await saveFile(text, suggested, fileDesc, acceptMap);
    } catch {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async (fmt) => {
    setShowFmt(false);
    if (selected.size === 0) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const text = await fetchContent(fmt);
      setPreview({ text, format: fmt });
    } catch {
      alert("Preview failed. Please try again.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAddToProject = (fmt) => {
    setShowAddFmt(false);
    if (!user) {
      alert("Please sign in to save proteins to your project.");
      return;
    }
    if (selected.size === 0) return;
    const selectedProteins = proteins.filter(p => selected.has(p.accession));
    selectedProteins.forEach(p => {
      addDownloadedProtein({
        accession: p.accession,
        entryName: p.entryName || "",
        gene: p.allGenes?.join(", ") || p.gene || "",
        organism: p.organism || "",
        format: fmt,
        label: `${p.accession} (${fmt.toUpperCase()})`,
        content: null,
      });
    });
    setAddMsg(`✓ ${selectedProteins.length} added!`);
    setTimeout(() => setAddMsg(""), 2000);
  };

  const allChecked = proteins.length > 0 && selected.size === proteins.length;
  const someChecked = selected.size > 0 && selected.size < proteins.length;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Dynamic Action Bar */}
      {selected.size > 0 && (
        <Card hover={false} className="bg-blue-50/40 border-blue-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
            <span className="text-xs font-semibold text-blue-700">
              {selected.size} protein{selected.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Download dropdown */}
              <div className="relative">
                <Button
                  onClick={() => { setShowFmt(f => !f); setShowAddFmt(false); }}
                  disabled={downloading}
                  size="sm"
                  variant="primary"
                  className="flex items-center gap-1.5"
                >
                  <Download size={13} />
                  {downloading ? "Fetching..." : "Download"}
                </Button>
                {showFmt && (
                  <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-52 py-2 animate-slide-in">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      Choose Format
                    </div>
                    <div className="border-b border-slate-100 pb-2 mb-2 px-3 py-1.5">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">FASTA Sequence</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownload("fasta")} 
                          className="flex-1 text-[10px] bg-blue-600 text-white rounded-lg px-2 py-1.5 hover:bg-blue-700 transition-colors font-semibold cursor-pointer border-none"
                        >Download</button>
                        <button 
                          onClick={() => handlePreview("fasta")} 
                          className="flex-1 text-[10px] border border-blue-200 text-blue-600 rounded-lg px-2 py-1.5 hover:bg-blue-50 transition-colors font-semibold cursor-pointer"
                        >Preview</button>
                      </div>
                    </div>
                    <div className="px-3 py-1.5">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">Full Text Entry</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownload("txt")} 
                          className="flex-1 text-[10px] bg-blue-600 text-white rounded-lg px-2 py-1.5 hover:bg-blue-700 transition-colors font-semibold cursor-pointer border-none"
                        >Download</button>
                        <button 
                          onClick={() => handlePreview("txt")} 
                          className="flex-1 text-[10px] border border-blue-200 text-blue-600 rounded-lg px-2 py-1.5 hover:bg-blue-50 transition-colors font-semibold cursor-pointer"
                        >Preview</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Add to Project dropdown */}
              <div className="relative">
                <Button
                  onClick={() => { setShowAddFmt(f => !f); setShowFmt(false); }}
                  size="sm"
                  variant="secondary"
                  className="flex items-center gap-1.5"
                >
                  <BookmarkPlus size={13} className="text-slate-500" />
                  {addMsg ? (
                    <span className="text-emerald-600 font-semibold">{addMsg}</span>
                  ) : user ? (
                    "Add to Project"
                  ) : (
                    "Sign in to Save"
                  )}
                </Button>
                {showAddFmt && (
                  <div className="absolute right-0 top-10 z-20 bg-white border border-slate-200 rounded-xl shadow-lg w-52 py-2 animate-slide-in">
                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      Save as Project Format
                    </div>
                    <button 
                      onClick={() => handleAddToProject("fasta")} 
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <div className="font-semibold text-slate-800">FASTA Sequence</div>
                      <div className="text-[10px] text-slate-400">Pure sequence string</div>
                    </button>
                    <button 
                      onClick={() => handleAddToProject("txt")} 
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100 border-none bg-transparent cursor-pointer"
                    >
                      <div className="font-semibold text-slate-800">Text Entry</div>
                      <div className="text-[10px] text-slate-400">Full annotation record</div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setSelected(new Set()); setPreview(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 cursor-pointer font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Preview Loading State */}
      {previewLoading && (
        <Card hover={false} className="p-5 border-blue-100 bg-blue-50/10">
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs font-semibold text-blue-700 animate-pulse">
              Fetching database entry preview...
            </span>
          </div>
        </Card>
      )}

      {/* Preview Panel Display */}
      {preview && (
        <Card hover={false} className="border-slate-200 overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-150 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-800">Entry Preview</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono uppercase font-semibold border border-blue-100">
                {preview.format}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleDownload(preview.format)} size="sm" variant="secondary" className="flex items-center gap-1">
                <Download size={12} /> Download
              </Button>
              <button 
                onClick={() => setPreview(null)} 
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-450 hover:text-slate-650 flex items-center justify-center cursor-pointer transition-all focus:outline-none"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-auto select-text">
            {preview.text}
          </pre>
        </Card>
      )}

      {/* Unified Table */}
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow hover={false}>
              <TableCell header={true} className="w-8 !px-4">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-slate-350 text-blue-650 cursor-pointer accent-blue-600 focus:ring-blue-500 focus:ring-2"
                />
              </TableCell>
              {["Accession", "Entry Name", "Protein Names", "Gene Names", "Organism", "Length", "Status"].map(h => (
                <TableCell key={h} header={true} className="whitespace-nowrap">
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {proteins.map((p, i) => {
              const isChecked = selected.has(p.accession);
              return (
                <TableRow
                  key={p.accession + i}
                  isChecked={isChecked}
                  striped={true}
                  onClick={() => onSelect && onSelect(p)}
                  className="cursor-pointer"
                >
                  {/* Checkbox cell */}
                  <TableCell className="!px-4" onClick={e => toggleOne(e, p.accession)}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-slate-300 text-blue-650 cursor-pointer accent-blue-600 focus:ring-blue-500"
                    />
                  </TableCell>

                  {/* Accession */}
                  <TableCell className="font-semibold text-blue-600">
                    {p.accession}
                  </TableCell>

                  {/* Entry Name */}
                  <TableCell className="font-semibold text-slate-800 whitespace-nowrap">
                    {p.entryName}
                  </TableCell>

                  {/* Protein Names */}
                  <TableCell className="max-w-[280px] truncate text-slate-700">
                    {p.allProteinNames?.length > 0 ? p.allProteinNames.join(", ") : p.proteinName || "—"}
                  </TableCell>

                  {/* Gene Names */}
                  <TableCell className="italic text-slate-700 max-w-[200px] truncate">
                    {p.allGenes?.length > 0 ? p.allGenes.join(", ") : (p.gene && p.gene !== "N/A" ? p.gene : "—")}
                  </TableCell>

                  {/* Organism */}
                  <TableCell className="italic text-slate-550 max-w-[160px] truncate">
                    {p.organism || "—"}
                  </TableCell>

                  {/* Length */}
                  <TableCell className="whitespace-nowrap text-slate-550 font-medium">
                    {p.length !== "N/A" ? `${p.length.toLocaleString()} AA` : "—"}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    {p.status === "Reviewed" ? (
                      <Badge variant="success" className="flex items-center gap-1 w-fit">
                        <CheckCircle2 size={10} className="text-emerald-500" /> Reviewed
                      </Badge>
                    ) : (
                      <Badge variant="slate" className="flex items-center gap-1 w-fit">
                        Unreviewed
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {(showFmt || showAddFmt) && (
        <div className="fixed inset-0 z-10" onClick={() => { setShowFmt(false); setShowAddFmt(false); }} />
      )}
    </div>
  );
}