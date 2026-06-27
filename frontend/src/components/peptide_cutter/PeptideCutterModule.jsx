import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Scissors, Search, Download, Trash2, HelpCircle, Check, Loader2, Info } from "lucide-react";

// Standard Amino Acid Three-Letter Map for PDB parser
const AA_MAP = {
  ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C",
  GLU: "E", GLN: "Q", GLY: "G", HIS: "H", ILE: "I",
  LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P",
  SER: "S", THR: "T", TRP: "W", TYR: "Y", VAL: "V",
  ASX: "B", GLX: "Z", SEC: "U", PYL: "O", XAA: "X",
  UNK: "X"
};

function formatRuleSummary(enz) {
  switch (enz.key) {
    case "ArgC": return "R | X";
    case "AspN": return "X | D";
    case "AspGluN": return "X | [DE]";
    case "BNPS": return "W | X";
    case "CNBr": return "M | X";
    case "HCOOH": return "D | X";
    case "Glu": return "E | X";
    case "Iodo": return "W | X";
    case "LysC": return "K | X";
    case "LysN": return "X | K";
    case "NTCB": return "X | C";
    case "Elast": return "[AV] | X";
    case "TEV": return "X-Y-X-Q | [GS]";
    case "Staph": return "[^E]-E | X";
    case "Pro": return "[HKR]-P | [^P]";
    case "Tryps": return "[KR] | [^P] (Exceptions apply)";
    case "Casp1": return "[FWYL]-X-[HAT]-D | [^PEDQKR]";
    case "Casp2": return "D-V-A-D | [^PEDQKR]";
    case "Casp3": return "D-M-Q-D | [^PEDQKR]";
    case "Casp4": return "L-E-V-D | [^PEDQKR]";
    case "Casp5": return "[LW]-E-H-D | X";
    case "Casp6": return "V-E-[HI]-D | [^PEDQKR]";
    case "Casp7": return "D-E-V-D | [^PEDQKR]";
    case "Casp8": return "[IL]-E-T-D | [^PEDQKR]";
    case "Casp9": return "L-E-H-D | X";
    case "Casp10": return "I-E-A-D | X";
    case "Enter": return "[DE]-[DE]-[DE]-K | X";
    case "Xa": return "[AFGILTVM]-[DE]-G-R | X";
    case "GranB": return "I-E-P-D | X";
    case "Hydro": return "N | G";
    case "ProtK": return "[AEFILTVWY] | X";
    case "Therm": return "[^DE] | [AFILMV]";
    case "Throm":
      if (enz.name && enz.name.includes("Standard")) return "G-R | G";
      if (enz.name && enz.name.includes("Sophisticated")) return "[AFGILTVM]-[AFGILTVW]-P-R | [^DE][^DE]";
      return "G-R | G or [AFGILTVM]-[AFGILTVW]-P-R | [^DE][^DE]";
    case "Ch_hi":
      if (enz.name && enz.name.includes("F, Y")) return "[FY] | [^P]";
      if (enz.name && enz.name.includes("(W)")) return "W | [^MP]";
      return "[FY] | [^P] or W | [^MP]";
    case "Ch_lo":
      if (enz.name && enz.name.includes("F, L, Y")) return "[FYL] | [^P]";
      if (enz.name && enz.name.includes("(W)")) return "W | [^MP]";
      if (enz.name && enz.name.includes("(M)")) return "M | [^PY]";
      if (enz.name && enz.name.includes("(H)")) return "H | [^DMPW]";
      return "[FYL] | [^P], W | [^MP], M | [^PY], H | [^DMPW]";
    case "Pn1.3":
      if (enz.name && enz.name.includes("Rule 1")) return "[^HKR]-[^P]-[^R] | [FL][^P]";
      if (enz.name && enz.name.includes("Rule 2")) return "[^HKR]-[^P]-[FL] | [^P]";
      return "[^HKR]-[^P]-[FL] | [^P] or [^HKR]-[^P]-[^R] | [FL][^P]";
    case "Pn2":
      if (enz.name && enz.name.includes("Rule 1")) return "[^HKR]-[^P]-[^R] | [FLWY][^P]";
      if (enz.name && enz.name.includes("Rule 2")) return "[^HKR]-[^P]-[FLWY] | [^P]";
      return "[^HKR]-[^P]-[FLWY] | [^P] or [^HKR]-[^P]-[^R] | [FLWY][^P]";
    default: return "-";
  }
}

// Enzyme Specificity Rules metadata for Specificity Modal
const ENZYME_SPECIFICITIES = [
  { key: "ArgC", name: "Arg-C proteinase", p4: "-", p3: "-", p2: "-", p1: "R", p1_prime: "-", p2_prime: "-" },
  { key: "AspN", name: "Asp-N endopeptidase", p4: "-", p3: "-", p2: "-", p1: "-", p1_prime: "D", p2_prime: "-" },
  { key: "AspGluN", name: "Asp-N endopeptidase + N-terminal Glu", p4: "-", p3: "-", p2: "-", p1: "-", p1_prime: "D or E", p2_prime: "-" },
  { key: "BNPS", name: "BNPS-Skatole", p4: "-", p3: "-", p2: "-", p1: "W", p1_prime: "-", p2_prime: "-" },
  { key: "Casp1", name: "Caspase 1", p4: "F, W, Y, or L", p3: "-", p2: "H, A or T", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp2", name: "Caspase 2", p4: "D", p3: "V", p2: "A", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp3", name: "Caspase 3", p4: "D", p3: "M", p2: "Q", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp4", name: "Caspase 4", p4: "L", p3: "E", p2: "V", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp5", name: "Caspase 5", p4: "L or W", p3: "E", p2: "H", p1: "D", p1_prime: "-", p2_prime: "-" },
  { key: "Casp6", name: "Caspase 6", p4: "V", p3: "E", p2: "H or I", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp7", name: "Caspase 7", p4: "D", p3: "E", p2: "V", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp8", name: "Caspase 8", p4: "I or L", p3: "E", p2: "T", p1: "D", p1_prime: "not P, E, D, Q, K or R", p2_prime: "-" },
  { key: "Casp9", name: "Caspase 9", p4: "L", p3: "E", p2: "H", p1: "D", p1_prime: "-", p2_prime: "-" },
  { key: "Casp10", name: "Caspase 10", p4: "I", p3: "E", p2: "A", p1: "D", p1_prime: "-", p2_prime: "-" },
  { key: "Ch_hi", name: "Chymotrypsin-high specificity (F, Y)", p4: "-", p3: "-", p2: "-", p1: "F or Y", p1_prime: "not P", p2_prime: "-" },
  { key: "Ch_hi", name: "Chymotrypsin-high specificity (W)", p4: "-", p3: "-", p2: "-", p1: "W", p1_prime: "not Met or Pro", p2_prime: "-" },
  { key: "Ch_lo", name: "Chymotrypsin-low specificity (F, L, Y)", p4: "-", p3: "-", p2: "-", p1: "F, L or Y", p1_prime: "not P", p2_prime: "-" },
  { key: "Ch_lo", name: "Chymotrypsin-low specificity (W)", p4: "-", p3: "-", p2: "-", p1: "W", p1_prime: "not Met or Pro", p2_prime: "-" },
  { key: "Ch_lo", name: "Chymotrypsin-low specificity (M)", p4: "-", p3: "-", p2: "-", p1: "M", p1_prime: "not Pro or Tyr", p2_prime: "-" },
  { key: "Ch_lo", name: "Chymotrypsin-low specificity (H)", p4: "-", p3: "-", p2: "-", p1: "H", p1_prime: "not Asp, Met, Pro or Trp", p2_prime: "-" },
  { key: "Clost", name: "Clostripain (Clostridiopeptidase B)", p4: "-", p3: "-", p2: "-", p1: "R", p1_prime: "-", p2_prime: "-" },
  { key: "CNBr", name: "CNBr", p4: "-", p3: "-", p2: "-", p1: "M", p1_prime: "-", p2_prime: "-" },
  { key: "Enter", name: "Enterokinase", p4: "D or E", p3: "D or E", p2: "D or E", p1: "K", p1_prime: "-", p2_prime: "-" },
  { key: "Xa", name: "Factor Xa", p4: "A, F, G, I, L, T, V or M", p3: "D or E", p2: "G", p1: "R", p1_prime: "-", p2_prime: "-" },
  { key: "HCOOH", name: "Formic acid", p4: "-", p3: "-", p2: "-", p1: "D", p1_prime: "-", p2_prime: "-" },
  { key: "Glu", name: "Glutamyl endopeptidase", p4: "-", p3: "-", p2: "-", p1: "E", p1_prime: "-", p2_prime: "-" },
  { key: "GranB", name: "GranzymeB", p4: "I", p3: "E", p2: "P", p1: "D", p1_prime: "-", p2_prime: "-" },
  { key: "Hydro", name: "Hydroxylamine", p4: "-", p3: "-", p2: "-", p1: "N", p1_prime: "G", p2_prime: "-" },
  { key: "Iodo", name: "Iodosobenzoic acid", p4: "-", p3: "-", p2: "-", p1: "W", p1_prime: "-", p2_prime: "-" },
  { key: "LysC", name: "LysC", p4: "-", p3: "-", p2: "-", p1: "K", p1_prime: "-", p2_prime: "-" },
  { key: "LysN", name: "LysN", p4: "-", p3: "-", p2: "-", p1: "-", p1_prime: "K", p2_prime: "-" },
  { key: "Elast", name: "Neutrophil elastase", p4: "-", p3: "-", p2: "-", p1: "A or V", p1_prime: "-", p2_prime: "-" },
  { key: "NTCB", name: "NTCB (2-nitro-5-thiocyanobenzoic acid)", p4: "-", p3: "-", p2: "-", p1: "-", p1_prime: "C", p2_prime: "-" },
  { key: "Pn1.3", name: "Pepsin (pH 1.3) (Rule 1)", p4: "-", p3: "not H, K or R", p2: "not P", p1: "not R", p1_prime: "F or L", p2_prime: "not P" },
  { key: "Pn1.3", name: "Pepsin (pH 1.3) (Rule 2)", p4: "not H, K or R", p3: "not P", p2: "F or L", p1: "-", p1_prime: "not P", p2_prime: "-" },
  { key: "Pn2", name: "Pepsin (pH > 2) (Rule 1)", p4: "-", p3: "not H, K or R", p2: "not P", p1: "not R", p1_prime: "F, L, W or Y", p2_prime: "not P" },
  { key: "Pn2", name: "Pepsin (pH > 2) (Rule 2)", p4: "not H, K or R", p3: "not P", p2: "F, L, W or Y", p1: "-", p1_prime: "not P", p2_prime: "-" },
  { key: "Pro", name: "Proline-endopeptidase", p4: "-", p3: "-", p2: "H, K or R", p1: "P", p1_prime: "not P", p2_prime: "-" },
  { key: "ProtK", name: "Proteinase K", p4: "-", p3: "-", p2: "-", p1: "A, E, F, I, L, T, V, W or Y", p1_prime: "-", p2_prime: "-" },
  { key: "Staph", name: "Staphylococcal peptidase I", p4: "-", p3: "-", p2: "not E", p1: "E", p1_prime: "-", p2_prime: "-" },
  { key: "TEV", name: "Tobacco etch virus protease", p4: "-", p3: "Y", p2: "-", p1: "Q", p1_prime: "G or S", p2_prime: "-" },
  { key: "Therm", name: "Thermolysin", p4: "-", p3: "-", p2: "-", p1: "not D or E", p1_prime: "A, F, I, L, M or V", p2_prime: "-" },
  { key: "Throm", name: "Thrombin (Standard)", p4: "-", p3: "-", p2: "G", p1: "R", p1_prime: "G", p2_prime: "-" },
  { key: "Throm", name: "Thrombin (Sophisticated)", p4: "A, F, G, I, L, T, V or M", p3: "A, F, G, I, L, T, V, W or A", p2: "P", p1: "R", p1_prime: "not D or E", p2_prime: "not D or E" },
  { key: "Tryps", name: "Trypsin", p4: "-", p3: "-", p2: "-", p1: "K or R", p1_prime: "not P", p2_prime: "-" }
];

// Presets mapping
const PRESETS = {
  common: ["Tryps", "Ch_hi", "CNBr", "Glu", "LysC", "LysN", "AspN"],
  caspases: ["Casp1", "Casp2", "Casp3", "Casp4", "Casp5", "Casp6", "Casp7", "Casp8", "Casp9", "Casp10"]
};

// Quick Examples
const EXAMPLES = {
  gapdh: "MGKVKVGVNGFGRIGRLVTRAAFNSGKVDIVAINDPFIDLNYMVYMFQYDSTHGKFHGTVKAENGKLVINGNPITIFQERDPSKIKWGDAGAEYVVESTGVFTTMEKAGAHLQGGAKRVIISAPSADAPMFVMGVNHEKYDNSLKIISNASCTTNCLAPLAKVIHDNFGIVEGLMTTVHAITATQKTVDGPSGKLWRDGRGALQNIIPASTGAAKAVGKVIPELNGKLTGMAFRVPTANVSVVDLTCRLEKPAKYDDIKKVVKQASEGPLKGILGYTEHQVVSSDFNSDTHSSTFDAGAGIALNDHFVKLISWYDNEFGYSNRVVDLMAHMASKE",
  insulin: "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN",
  servelat: "SERVELATTRYPSINKYLSET"
};

const EXAMPLE_METAS = {
  gapdh: {
    accession: "P04406",
    proteinName: "Glyceraldehyde-3-phosphate dehydrogenase (GAPDH)",
    geneName: "GAPDH",
    organism: "Homo sapiens (Human)",
    length: 335
  },
  insulin: {
    accession: "P01308",
    proteinName: "Insulin",
    geneName: "INS",
    organism: "Homo sapiens (Human)",
    length: 110
  },
  servelat: {
    accession: "Custom",
    proteinName: "SERVELAT Test Peptide",
    geneName: "N/A",
    organism: "Synthetic",
    length: 21
  }
};

export default function PeptideCutterModule() {
  const [sequence, setSequence] = useState("");
  const [proteinMeta, setProteinMeta] = useState(null);
  const [enzymes, setEnzymes] = useState([]);
  const [selectedEnzymes, setSelectedEnzymes] = useState(new Set());
  const [results, setResults] = useState(null);

  const [recentAnalyses, setRecentAnalyses] = useState(() => {
    try {
      const saved = localStorage.getItem("recent_peptide_analyses");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentAnalysis = (cleanSeq, selectedEnzymesSet) => {
    setRecentAnalyses((prev) => {
      const enzymesList = Array.from(selectedEnzymesSet);
      const name = proteinMeta?.accession || `Cleavage of ${cleanSeq.length} aa sequence`;
      
      const newEntry = {
        name,
        sequence: cleanSeq,
        enzymes: enzymesList,
        timestamp: Date.now()
      };
      
      const filtered = prev.filter(
        (item) => !(item.name === name && item.sequence === cleanSeq)
      );
      const updated = [newEntry, ...filtered].slice(0, 5);
      localStorage.setItem("recent_peptide_analyses", JSON.stringify(updated));
      return updated;
    });
  };
  
  // Model Settings
  const [sophisticatedToggle, setSophisticatedToggle] = useState(true);
  const [minProbability, setMinProbability] = useState(30);
  const [probabilityModel, setProbabilityModel] = useState("both");

  // Display Filters
  const [blockSize, setBlockSize] = useState(10);
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [filterExactlyVal, setFilterExactlyVal] = useState(1);
  const [filterMinVal, setFilterMinVal] = useState(1);
  const [filterMaxVal, setFilterMaxVal] = useState(5);

  // Result view tabs & filters
  const [activeTab, setActiveTab] = useState("sequential");
  const [lengthFilter, setLengthFilter] = useState("all");
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");

  const t1 = 6, t2 = 50, t3 = 70; // Hardcoded length thresholds

  // UniProt Lookup
  const [uniprotId, setUniprotId] = useState("");
  const [loadingUniProt, setLoadingUniProt] = useState(false);
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Project Explorer state
  const [projectItems, setProjectItems] = useState([]);
  const [activeProjectItemId, setActiveProjectItemId] = useState(null);

  // Search filter for enzyme lists
  const [enzymeSearch, setEnzymeSearch] = useState({ proteases: "", caspases: "", chemicals: "" });
  const [enzTab, setEnzTab] = useState("proteases");

  // Interactive Cleavage Map tooltip state
  const [tooltip, setTooltip] = useState(null); // { x, y, cuts, position }
  const fileInputRef = useRef(null);

  // Specificity Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTargetKey, setModalTargetKey] = useState("all");
  const [modalLengthFilter, setModalLengthFilter] = useState("all");
  const [modalCustomMin, setModalCustomMin] = useState("");
  const [modalCustomMax, setModalCustomMax] = useState("");

  // Specs Table search and filter
  const [refSearchQuery, setRefSearchQuery] = useState("");
  const [refFilterType, setRefFilterType] = useState("all");

  const filteredSpecs = useMemo(() => {
    return ENZYME_SPECIFICITIES.map(spec => {
      const dbEnz = enzymes.find(e => e.key === spec.key);
      const type = dbEnz ? dbEnz.type : (spec.key === "CNBr" || spec.key === "BNPS" || spec.key === "HCOOH" || spec.key === "Hydro" || spec.key === "Iodo" || spec.key === "NTCB" ? "chemical" : "enzyme");
      const description = dbEnz ? dbEnz.description : "";
      return {
        ...spec,
        type,
        description
      };
    }).filter(enz => {
      const typeLabel = enz.type === "chemical" ? "Chemical" : "Protease";
      const specificityRule = formatRuleSummary(enz);
      const query = refSearchQuery.toLowerCase();
      const matchesSearch = 
        enz.name.toLowerCase().includes(query) || 
        typeLabel.toLowerCase().includes(query) || 
        specificityRule.toLowerCase().includes(query) || 
        (enz.description && enz.description.toLowerCase().includes(query));
      
      const matchesFilter = 
        refFilterType === "all" || 
        (refFilterType === "enzyme" && enz.type !== "chemical") || 
        (refFilterType === "chemical" && enz.type === "chemical");

      return matchesSearch && matchesFilter;
    });
  }, [enzymes, refSearchQuery, refFilterType]);

  // Load enzymes metadata and project explorer items from LocalStorage on mount
  useEffect(() => {
    fetchEnzymes();
    const savedProjects = localStorage.getItem("peptidecutter_project_items");
    const savedActiveId = localStorage.getItem("peptidecutter_active_project_id");
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjectItems(parsed);
        if (savedActiveId) setActiveProjectItemId(savedActiveId);
      } catch (err) {
        console.error("Failed to restore project explorer state", err);
      }
    }
  }, []);

  // Save project explorer items when they change
  useEffect(() => {
    localStorage.setItem("peptidecutter_project_items", JSON.stringify(projectItems));
  }, [projectItems]);

  useEffect(() => {
    localStorage.setItem("peptidecutter_active_project_id", activeProjectItemId || "");
  }, [activeProjectItemId]);

  const fetchEnzymes = async () => {
    try {
      const res = await axios.get("/api/peptide-cutter/enzymes");
      setEnzymes(res.data);
      // Default: Check all
      const allKeys = res.data.map(e => e.key);
      setSelectedEnzymes(new Set(allKeys));
    } catch (err) {
      console.error("Failed to load enzymes metadata", err);
    }
  };

  // Preset selectors
  const toggleAllEnzymes = (checked) => {
    if (checked) {
      setSelectedEnzymes(new Set(enzymes.map(e => e.key)));
    } else {
      setSelectedEnzymes(new Set());
    }
  };

  const selectPreset = (type) => {
    if (type === "proteases") {
      const keys = enzymes.filter(e => e.type !== "chemical").map(e => e.key);
      setSelectedEnzymes(new Set(keys));
    } else if (type === "chemicals") {
      const keys = enzymes.filter(e => e.type === "chemical").map(e => e.key);
      setSelectedEnzymes(new Set(keys));
    } else {
      const keys = PRESETS[type] || [];
      setSelectedEnzymes(new Set(keys));
    }
  };

  // Clean Sequence
  const cleanSequence = (seqText) => {
    let text = seqText.trim().toUpperCase();
    if (text.startsWith(">")) {
      const lines = text.split("\n");
      text = lines.slice(1).join("");
    }
    text = text.replace(/[^A-Z]/g, "");
    return text;
  };

  const handleCleanClick = () => {
    const cleaned = cleanSequence(sequence);
    setSequence(cleaned);
  };

  // Example sequences loaders
  const loadExample = (key) => {
    const seq = EXAMPLES[key];
    const meta = EXAMPLE_METAS[key];
    setSequence(seq);
    setProteinMeta(meta);
    setActiveProjectItemId(null);
    setResults(null);
  };

  // PDB file parser
  const parsePDB = (text) => {
    const lines = text.split("\n");
    const chains = {};
    const seqresLines = lines.filter(l => l.startsWith("SEQRES"));
    
    if (seqresLines.length > 0) {
      seqresLines.forEach(line => {
        const chainId = line.substring(11, 12).trim() || "A";
        const residues = line.substring(19, 70).trim().split(/\s+/);
        if (!chains[chainId]) chains[chainId] = [];
        residues.forEach(res => {
          const char = AA_MAP[res.toUpperCase()];
          if (char) chains[chainId].push(char);
        });
      });
    }

    if (Object.keys(chains).length === 0) {
      const atomLines = lines.filter(l => l.startsWith("ATOM  "));
      const seenResidues = {};
      atomLines.forEach(line => {
        const resName = line.substring(17, 20).trim().toUpperCase();
        const chainId = line.substring(21, 22).trim() || "A";
        const resSeq = parseInt(line.substring(22, 26).trim());

        if (!seenResidues[chainId]) seenResidues[chainId] = new Set();
        if (!chains[chainId]) chains[chainId] = [];

        const residueKey = `${resSeq}-${resName}`;
        if (!seenResidues[chainId].has(residueKey)) {
          seenResidues[chainId].add(residueKey);
          const char = AA_MAP[resName];
          if (char) {
            chains[chainId].push({ seq: resSeq, char });
          }
        }
      });

      for (let chainId in chains) {
        chains[chainId] = chains[chainId]
          .sort((a, b) => a.seq - b.seq)
          .map(item => item.char);
      }
    }

    const result = {};
    for (let chainId in chains) {
      result[chainId] = chains[chainId].join("");
    }
    return result;
  };

  const handlePDBUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdb")) {
      alert("Invalid file type. Please upload a file with the .pdb extension.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const chains = parsePDB(text);
      const chainKeys = Object.keys(chains);

      if (chainKeys.length === 0) {
        alert("Could not extract any amino acid sequence details from this PDB file.");
        return;
      }

      // Add all chains to project items
      const newItems = [...projectItems];
      let firstChainId = null;

      chainKeys.forEach(chainId => {
        const itemId = `pdb-${Date.now()}-${chainId}`;
        if (!firstChainId) firstChainId = itemId;
        newItems.push({
          id: itemId,
          type: "pdb",
          name: `${file.name.replace(/\.pdb$/i, "")} (Chain ${chainId})`,
          sequence: chains[chainId],
          meta: {
            accession: `PDB: ${file.name.substring(0, 8)}`,
            proteinName: `${file.name.replace(/\.pdb$/i, "")} (Chain ${chainId})`,
            geneName: "N/A",
            organism: "Reconstructed from PDB structure file",
            length: chains[chainId].length
          }
        });
      });

      setProjectItems(newItems);
      // Activate the first chain
      if (firstChainId) {
        const item = newItems.find(it => it.id === firstChainId);
        setSequence(item.sequence);
        setProteinMeta(item.meta);
        setActiveProjectItemId(firstChainId);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset file input
  };

  // Add current sequence as project item
  const saveToProject = () => {
    const cleanSeq = cleanSequence(sequence);
    if (!cleanSeq) {
      alert("Please enter a sequence to save to the Project Explorer.");
      return;
    }
    const itemId = `raw-${Date.now()}`;
    const newItem = {
      id: itemId,
      type: "raw",
      name: `Sequence_${cleanSeq.substring(0, 6)}... (${cleanSeq.length} aa)`,
      sequence: cleanSeq,
      meta: proteinMeta || {
        accession: "Custom",
        proteinName: "User Saved Sequence",
        geneName: "N/A",
        organism: "Synthetic",
        length: cleanSeq.length
      }
    };
    setProjectItems([...projectItems, newItem]);
    setActiveProjectItemId(itemId);
  };

  const removeProjectItem = (id, e) => {
    e.stopPropagation();
    setProjectItems(projectItems.filter(it => it.id !== id));
    if (activeProjectItemId === id) {
      setActiveProjectItemId(null);
    }
  };

  // Load from UniProt ID
  const handleUniProtImport = async () => {
    if (!uniprotId.trim()) {
      alert("Please enter a valid protein accession/ID first.");
      return;
    }
    setLoadingUniProt(true);
    setErrorMessage("");
    try {
      const res = await axios.get(`/api/peptide-cutter/uniprot/${uniprotId.trim()}`);
      if (res.data.success) {
        setSequence(res.data.sequence);
        const meta = {
          accession: res.data.accession,
          proteinName: res.data.proteinName,
          geneName: res.data.geneName,
          organism: res.data.organism,
          length: res.data.sequence.length
        };
        setProteinMeta(meta);
        // Add to project explorer
        const itemId = `uniprot-${Date.now()}`;
        setProjectItems(prev => [
          ...prev,
          {
            id: itemId,
            type: "uniprot",
            name: `${meta.accession} - ${meta.proteinName.substring(0, 20)}...`,
            sequence: res.data.sequence,
            meta
          }
        ]);
        setActiveProjectItemId(itemId);
        setUniprotId("");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Failed to import protein from database.");
    } finally {
      setLoadingUniProt(false);
    }
  };

  // Perform digest cleavage logic
  const handlePerformDigest = async () => {
    const cleanSeq = cleanSequence(sequence);
    if (!cleanSeq) {
      alert("Please enter or import a protein sequence first.");
      return;
    }
    if (selectedEnzymes.size === 0) {
      alert("Please select at least one cleavage enzyme or chemical.");
      return;
    }

    setLoadingDigest(true);
    setErrorMessage("");
    try {
      const payload = {
        sequence: cleanSeq,
        enzymes: Array.from(selectedEnzymes),
        minProbability: sophisticatedToggle ? minProbability : 0,
        probabilityModel
      };
      const res = await axios.post("/api/peptide-cutter/cleave", payload);
      setResults(res.data);
      saveRecentAnalysis(cleanSeq, selectedEnzymes);
      // Scroll to results panel
      setTimeout(() => {
        document.getElementById("peptide-results-header")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || "Digest simulation failed.");
    } finally {
      setLoadingDigest(false);
    }
  };

  // Grouped enzymes list for checkboxes
  const categorizedEnzymes = useMemo(() => {
    const sorted = [...enzymes].sort((a, b) => a.name.localeCompare(b.name));
    return {
      proteases: sorted.filter(e => e.type !== "chemical" && !e.key.startsWith("Casp")),
      caspases: sorted.filter(e => e.key.startsWith("Casp")),
      chemicals: sorted.filter(e => e.type === "chemical")
    };
  }, [enzymes]);

  const toggleEnzyme = (key) => {
    const updated = new Set(selectedEnzymes);
    if (updated.has(key)) {
      updated.delete(key);
    } else {
      updated.add(key);
    }
    setSelectedEnzymes(updated);
  };

  // Client-side frequency filters
  const filteredResults = useMemo(() => {
    if (!results) return null;

    let filteredSites = results.cleavageSites;
    if (frequencyFilter !== "all") {
      let filteredKeys = [];
      if (frequencyFilter === "exactly") {
        filteredKeys = results.summary
          .filter(s => s.cleavagesCount === filterExactlyVal)
          .map(s => s.key);
      } else if (frequencyFilter === "range") {
        filteredKeys = results.summary
          .filter(s => s.cleavagesCount >= filterMinVal && s.cleavagesCount <= filterMaxVal)
          .map(s => s.key);
      }
      filteredSites = results.cleavageSites.filter(site => filteredKeys.includes(site.enzymeKey));
    }

    // Reconstruct fragments based on filtered cuts
    const N = results.sequence.length;
    const cutPositions = Array.from(new Set(filteredSites.map(s => s.position))).sort((a, b) => a - b);
    const fragments = [];
    let prevPos = 0;

    const addFragment = (startIdx, endIdx) => {
      const fragSeq = results.sequence.substring(startIdx, endIdx);
      if (fragSeq.length === 0) return;

      let mass = 18.015;
      let unknown = 0;
      for (let char of fragSeq) {
        if (AA_MAP[char.toUpperCase()] || char === "A" || char === "R" || char === "N" || char === "D" || char === "C" || char === "E" || char === "Q" || char === "G" || char === "H" || char === "I" || char === "L" || char === "K" || char === "M" || char === "F" || char === "P" || char === "S" || char === "T" || char === "W" || char === "Y" || char === "V") {
          // simple mass map
          const residueMass = {
            A: 71.08, R: 156.19, N: 114.10, D: 115.09, C: 103.14,
            E: 129.12, Q: 128.13, G: 57.05, H: 137.14, I: 113.16,
            L: 113.16, K: 128.17, M: 131.19, F: 147.18, P: 97.12,
            S: 87.08, T: 101.11, W: 186.21, Y: 163.18, V: 99.13
          }[char];
          mass += residueMass;
        } else {
          unknown++;
        }
      }

      fragments.push({
        index: fragments.length + 1,
        start: startIdx + 1,
        end: endIdx,
        length: fragSeq.length,
        sequence: fragSeq,
        mass: unknown === 0 ? parseFloat(mass.toFixed(3)) : null,
        hasUnknownResidues: unknown > 0
      });
    };

    cutPositions.forEach(pos => {
      addFragment(prevPos, pos);
      prevPos = pos;
    });
    addFragment(prevPos, N);

    return {
      ...results,
      cleavageSites: filteredSites,
      fragments
    };
  }, [results, frequencyFilter, filterExactlyVal, filterMinVal, filterMaxVal]);

  // Peptides lists helper for sequential table
  const sequentialPeptides = useMemo(() => {
    if (!filteredResults) return [];
    const N = filteredResults.sequence.length;
    const sites = filteredResults.cleavageSites;

    // Group sites by position
    const positionGroups = {};
    sites.forEach(site => {
      const pos = site.position;
      if (!positionGroups[pos]) positionGroups[pos] = [];
      positionGroups[pos].push({ key: site.enzymeKey, name: site.enzymeName });
    });

    const cutPositions = Object.keys(positionGroups).map(Number).sort((a, b) => a - b);
    const peptides = [];

    // First fragment
    const firstCut = cutPositions[0] || N;
    const firstSeq = filteredResults.sequence.substring(0, firstCut);
    if (firstSeq.length > 0) {
      peptides.push({
        cleavagePosition: "-",
        enzymes: [],
        sequence: firstSeq,
        length: firstSeq.length,
        mass: getPeptideMass(firstSeq)
      });
    }

    // Middle and last fragments
    for (let i = 0; i < cutPositions.length; i++) {
      const currentCut = cutPositions[i];
      const nextCut = cutPositions[i + 1] || N;
      const fragSeq = filteredResults.sequence.substring(currentCut, nextCut);
      if (fragSeq.length > 0) {
        const uniqueEnz = [];
        const seen = new Set();
        positionGroups[currentCut].forEach(enz => {
          if (!seen.has(enz.key)) {
            seen.add(enz.key);
            uniqueEnz.push(enz);
          }
        });
        peptides.push({
          cleavagePosition: currentCut,
          enzymes: uniqueEnz,
          sequence: fragSeq,
          length: fragSeq.length,
          mass: getPeptideMass(fragSeq)
        });
      }
    }

    return peptides;
  }, [filteredResults]);

  function getPeptideMass(fragSeq) {
    let mass = 18.015;
    let unknown = 0;
    const MASSES = {
      A: 71.08, R: 156.19, N: 114.10, D: 115.09, C: 103.14,
      E: 129.12, Q: 128.13, G: 57.05, H: 137.14, I: 113.16,
      L: 113.16, K: 128.17, M: 131.19, F: 147.18, P: 97.12,
      S: 87.08, T: 101.11, W: 186.21, Y: 163.18, V: 99.13
    };
    for (let char of fragSeq) {
      if (MASSES[char]) mass += MASSES[char];
      else unknown++;
    }
    return unknown === 0 ? `${mass.toFixed(3)} Da` : "Contains unknown aa";
  }

  // Filters sequential peptides list client side
  const filteredSequentialPeptides = useMemo(() => {
    const list = sequentialPeptides;
    const hasMin = customMin !== "" && !isNaN(parseInt(customMin));
    const hasMax = customMax !== "" && !isNaN(parseInt(customMax));

    if (hasMin || hasMax) {
      const minVal = hasMin ? parseInt(customMin) : 1;
      const maxVal = hasMax ? parseInt(customMax) : 9999;
      return list.filter(p => p.length >= minVal && p.length <= maxVal);
    }

    if (lengthFilter === "below") return list.filter(p => p.length < t1);
    if (lengthFilter === "range1") return list.filter(p => p.length >= t1 && p.length <= t2);
    if (lengthFilter === "range2") return list.filter(p => p.length >= (t2 + 1) && p.length <= t3);
    if (lengthFilter === "above") return list.filter(p => p.length >= (t3 + 1));

    return list;
  }, [sequentialPeptides, lengthFilter, customMin, customMax]);

  // Alphabetical summary
  const alphabeticalSummary = useMemo(() => {
    if (!filteredResults) return [];
    return [...filteredResults.summary]
      .filter(s => selectedEnzymes.has(s.key))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredResults, selectedEnzymes]);

  // Frequency chart summary list
  const activeChartSummary = useMemo(() => {
    if (!filteredResults) return [];
    return [...filteredResults.summary]
      .filter(s => selectedEnzymes.has(s.key) && s.cleavagesCount > 0)
      .sort((a, b) => b.cleavagesCount - a.cleavagesCount);
  }, [filteredResults, selectedEnzymes]);

  // Cleavage site mapping
  const cleavageSitesMap = useMemo(() => {
    if (!filteredResults) return {};
    const map = {};
    filteredResults.cleavageSites.forEach(site => {
      const idx = site.position - 1; // 0-indexed bond cuts after residue index
      if (!map[idx]) map[idx] = [];
      map[idx].push(site);
    });
    return map;
  }, [filteredResults]);

  // Specificity Modal tables helper
  const modalFilteredSites = useMemo(() => {
    if (!results) return [];
    const showAll = !modalTargetKey || modalTargetKey === "all";
    if (showAll) return results.cleavageSites;
    return results.cleavageSites.filter(s => s.enzymeKey === modalTargetKey);
  }, [results, modalTargetKey]);

  const modalPeptides = useMemo(() => {
    if (!results) return [];
    const N = results.sequence.length;

    // Group sites by position
    const positionGroups = {};
    modalFilteredSites.forEach(site => {
      const pos = site.position;
      if (!positionGroups[pos]) positionGroups[pos] = [];
      positionGroups[pos].push({ key: site.enzymeKey, name: site.enzymeName });
    });

    const cutPositions = Object.keys(positionGroups).map(Number).sort((a, b) => a - b);
    const peptides = [];

    // First fragment
    const firstCut = cutPositions[0] || N;
    const firstSeq = results.sequence.substring(0, firstCut);
    if (firstSeq.length > 0) {
      peptides.push({
        cleavagePosition: "-",
        enzymes: [],
        sequence: firstSeq,
        length: firstSeq.length,
        mass: getPeptideMass(firstSeq)
      });
    }

    // Middle and last fragments
    for (let i = 0; i < cutPositions.length; i++) {
      const currentCut = cutPositions[i];
      const nextCut = cutPositions[i + 1] || N;
      const fragSeq = results.sequence.substring(currentCut, nextCut);
      if (fragSeq.length > 0) {
        const uniqueEnz = [];
        const seen = new Set();
        positionGroups[currentCut].forEach(enz => {
          if (!seen.has(enz.key)) {
            seen.add(enz.key);
            uniqueEnz.push(enz);
          }
        });
        peptides.push({
          cleavagePosition: currentCut,
          enzymes: uniqueEnz,
          sequence: fragSeq,
          length: fragSeq.length,
          mass: getPeptideMass(fragSeq)
        });
      }
    }

    return peptides;
  }, [results, modalFilteredSites]);

  const filteredModalPeptides = useMemo(() => {
    const list = modalPeptides;
    const hasMin = modalCustomMin !== "" && !isNaN(parseInt(modalCustomMin));
    const hasMax = modalCustomMax !== "" && !isNaN(parseInt(modalCustomMax));

    if (hasMin || hasMax) {
      const minVal = hasMin ? parseInt(modalCustomMin) : 1;
      const maxVal = hasMax ? parseInt(modalCustomMax) : 9999;
      return list.filter(p => p.length >= minVal && p.length <= maxVal);
    }

    if (modalLengthFilter === "below") return list.filter(p => p.length < t1);
    if (modalLengthFilter === "range1") return list.filter(p => p.length >= t1 && p.length <= t2);
    if (modalLengthFilter === "range2") return list.filter(p => p.length >= (t2 + 1) && p.length <= t3);
    if (modalLengthFilter === "above") return list.filter(p => p.length >= (t3 + 1));

    return list;
  }, [modalPeptides, modalLengthFilter, modalCustomMin, modalCustomMax]);

  // Export functions (CSV, Excel, PDF, FASTA)
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!filteredResults) return;
    const sites = filteredResults.cleavageSites || [];
    const sequence = filteredResults.sequence || "";

    const enzymeSitesMap = {};
    sites.forEach(s => {
      if (!enzymeSitesMap[s.enzymeKey]) {
        enzymeSitesMap[s.enzymeKey] = { name: s.enzymeName, sites: [] };
      }
      enzymeSitesMap[s.enzymeKey].sites.push(s);
    });

    const sortedEnzKeys = Object.keys(enzymeSitesMap).sort((a, b) => 
      enzymeSitesMap[a].name.localeCompare(enzymeSitesMap[b].name)
    );

    if (sortedEnzKeys.length === 0) {
      alert("No cleavage sites available to export.");
      return;
    }

    let csvOutput = "";
    if (lengthFilter !== "group") {
      csvOutput += sortedEnzKeys.map(k => `"${enzymeSitesMap[k].name}"`).join(", ") + "\n\n";
    }

    sortedEnzKeys.forEach(key => {
      const data = enzymeSitesMap[key];
      csvOutput += buildCSVForEnzyme(data.sites, sequence, data.name, lengthFilter, customMin, customMax);
    });

    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, "peptidecutter_cleavage_results.csv");
  };

  const buildCSVForEnzyme = (sites, sequence, name, lenFilter, cMin, cMax) => {
    const peps = getPeptidesForEnzyme(sites, sequence);
    const filtered = filterPeptidesList(peps, lenFilter, cMin, cMax);
    let csv = `"${name}"\n`;
    csv += "Position of cleavage site,Name of cleaving enzyme(s),Resulting peptide sequence (see explanations),Peptide length [aa],Peptide mass [Da]\n";
    
    filtered.forEach(p => {
      const enzStr = p.enzymes.length > 0 ? p.enzymes.map(e => e.name).join("; ") : name;
      csv += `${p.cleavagePosition},"${enzStr}","${p.sequence}",${p.length},${getPeptideMass(p.sequence)}\n`;
    });
    csv += "\n";
    return csv;
  };

  const getPeptidesForEnzyme = (sites, sequence) => {
    const N = sequence.length;
    const positionGroups = {};
    sites.forEach(site => {
      const pos = site.position;
      if (!positionGroups[pos]) positionGroups[pos] = [];
      positionGroups[pos].push({ key: site.enzymeKey, name: site.enzymeName });
    });

    const cutPositions = Object.keys(positionGroups).map(Number).sort((a, b) => a - b);
    const peptides = [];

    const firstCut = cutPositions[0] || N;
    const firstSeq = sequence.substring(0, firstCut);
    if (firstSeq.length > 0) {
      peptides.push({
        cleavagePosition: "-",
        enzymes: [],
        sequence: firstSeq,
        length: firstSeq.length
      });
    }

    for (let i = 0; i < cutPositions.length; i++) {
      const currentCut = cutPositions[i];
      const nextCut = cutPositions[i + 1] || N;
      const fragSeq = sequence.substring(currentCut, nextCut);
      if (fragSeq.length > 0) {
        const uniqueEnz = [];
        const seen = new Set();
        positionGroups[currentCut].forEach(enz => {
          if (!seen.has(enz.key)) {
            seen.add(enz.key);
            uniqueEnz.push(enz);
          }
        });
        peptides.push({
          cleavagePosition: currentCut,
          enzymes: uniqueEnz,
          sequence: fragSeq,
          length: fragSeq.length
        });
      }
    }
    return peptides;
  };

  const filterPeptidesList = (peps, lenFilter, cMin, cMax) => {
    const hasMin = cMin !== "" && cMin !== null && !isNaN(parseInt(cMin));
    const hasMax = cMax !== "" && cMax !== null && !isNaN(parseInt(cMax));
    if (hasMin || hasMax) {
      const minVal = hasMin ? parseInt(cMin) : 1;
      const maxVal = hasMax ? parseInt(cMax) : 9999;
      return peps.filter(p => p.length >= minVal && p.length <= maxVal);
    }
    if (lenFilter === "below") return peps.filter(p => p.length < t1);
    if (lenFilter === "range1") return peps.filter(p => p.length >= t1 && p.length <= t2);
    if (lenFilter === "range2") return peps.filter(p => p.length >= (t2 + 1) && p.length <= t3);
    if (lenFilter === "above") return peps.filter(p => p.length >= (t3 + 1));
    return peps;
  };

  // Excel exports (uses global XLSX library)
  const exportExcel = () => {
    if (!filteredResults) return;
    if (typeof XLSX === "undefined") {
      alert("XLSX library is not loaded. Please wait a moment or reload.");
      return;
    }
    const sites = filteredResults.cleavageSites || [];
    const sequence = filteredResults.sequence || "";

    const enzymeSitesMap = {};
    sites.forEach(s => {
      if (!enzymeSitesMap[s.enzymeKey]) {
        enzymeSitesMap[s.enzymeKey] = { name: s.enzymeName, sites: [] };
      }
      enzymeSitesMap[s.enzymeKey].sites.push(s);
    });

    const sortedEnzKeys = Object.keys(enzymeSitesMap).sort((a, b) => 
      enzymeSitesMap[a].name.localeCompare(enzymeSitesMap[b].name)
    );

    if (sortedEnzKeys.length === 0) {
      alert("No cleavage sites available to export.");
      return;
    }

    const wb = XLSX.utils.book_new();
    sortedEnzKeys.forEach(key => {
      const data = enzymeSitesMap[key];
      const rows = buildExcelRowsForEnzyme(data.sites, sequence, data.name, lengthFilter, customMin, customMax);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const sheetName = `"${data.name}"`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, "peptidecutter_cleavage_results.xlsx");
  };

  const buildExcelRowsForEnzyme = (sites, sequence, name, lenFilter, cMin, cMax) => {
    const headers = [
      "Position of cleavage site",
      "Name of cleaving enzyme(s)",
      "Resulting peptide sequence (see explanations)",
      "Peptide length [aa]",
      "Peptide mass [Da]"
    ];
    const peps = getPeptidesForEnzyme(sites, sequence);
    const filtered = filterPeptidesList(peps, lenFilter, cMin, cMax);
    const rows = [headers];
    filtered.forEach(p => {
      const enzStr = p.enzymes.length > 0 ? p.enzymes.map(e => e.name).join(", ") : name;
      rows.push([
        p.cleavagePosition,
        enzStr,
        p.sequence,
        `${p.length} aa`,
        getPeptideMass(p.sequence)
      ]);
    });
    return rows;
  };

  // PDF exports (uses global jsPDF library)
  // PDF exports (uses global jsPDF library)
  const exportPDF = () => {
    if (!filteredResults) return;
    if (typeof jspdf === "undefined" || !jspdf.jsPDF) {
      alert("jsPDF library is not loaded. Please wait a moment or reload.");
      return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape orientation
    const sequence = filteredResults.sequence || "";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PeptideCutter Pro - Protein Digestion Results", 14, 15);

    const pName = proteinMeta ? proteinMeta.proteinName : "Unknown Protein";
    const organism = proteinMeta ? proteinMeta.organism : "Unknown Organism";
    const gene = proteinMeta ? proteinMeta.geneName : "N/A";
    const length = sequence.length;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Protein: ${pName}`, 14, 22);
    doc.text(`Organism: ${organism}   |   Gene: ${gene}   |   Length: ${length} aa`, 14, 27);

    const filtered = filterPeptidesList(sequentialPeptides, lengthFilter, customMin, customMax);

    const headers = [["Position of cleavage site", "Name of cleaving enzyme(s)", "Resulting peptide sequence", "Peptide length [aa]", "Peptide mass [Da]"]];
    const rows = filtered.map(p => {
      const enzStr = p.enzymes && p.enzymes.length > 0 ? p.enzymes.map(e => e.name).join(", ") : "-";
      return [
        p.cleavagePosition,
        enzStr,
        p.sequence,
        `${p.length} aa`,
        p.mass || getPeptideMass(p.sequence)
      ];
    });

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 33,
      theme: "striped",
      headStyles: { fillColor: [2, 132, 199] },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 30 }, // Position
        1: { cellWidth: 60 }, // Enzyme
        2: { cellWidth: 'auto' }, // Sequence (will wrap)
        3: { cellWidth: 25 }, // Length
        4: { cellWidth: 35 }  // Mass
      },
      margin: { left: 14, right: 14 }
    });

    doc.save("peptidecutter_digestion_results.pdf");
  };

  // FASTA export (uses global JSZip library)
  const exportFASTA = () => {
    if (!filteredResults) return;
    if (typeof JSZip === "undefined") {
      alert("JSZip library is not loaded. Please wait a moment or reload.");
      return;
    }
    const sites = filteredResults.cleavageSites || [];
    const sequence = filteredResults.sequence || "";

    const enzymeSitesMap = {};
    sites.forEach(s => {
      if (!enzymeSitesMap[s.enzymeKey]) {
        enzymeSitesMap[s.enzymeKey] = { name: s.enzymeName, sites: [] };
      }
      enzymeSitesMap[s.enzymeKey].sites.push(s);
    });

    const sortedEnzKeys = Object.keys(enzymeSitesMap).sort((a, b) => 
      enzymeSitesMap[a].name.localeCompare(enzymeSitesMap[b].name)
    );

    if (sortedEnzKeys.length === 0) {
      alert("No cleavage sites available to export.");
      return;
    }

    const zip = new JSZip();
    const mainFolder = zip.folder("Peptides");
    let totalFiles = 0;

    sortedEnzKeys.forEach(key => {
      const data = enzymeSitesMap[key];
      const allPeptides = getPeptidesForEnzyme(data.sites, sequence);
      const filtered = filterPeptidesList(allPeptides, lengthFilter, customMin, customMax);

      if (filtered.length > 0) {
        const folderName = data.name.replace(/[\\/:*?"<>|]/g, "_").trim();
        const enzymeFolder = mainFolder.folder(folderName);
        const enzPrefix = data.name.substring(0, 3).toUpperCase();
        
        filtered.forEach(frag => {
          if (frag.cleavagePosition !== "-") {
            const fastaContent = `>${enzPrefix}-${frag.cleavagePosition}\n${frag.sequence}\n`;
            const fileName = `${enzPrefix}-${frag.cleavagePosition}.fasta`;
            enzymeFolder.file(fileName, fastaContent);
            totalFiles++;
          }
        });
      }
    });

    if (totalFiles === 0) {
      alert("No valid cleavage peptides found to export under the current filters.");
      return;
    }

    zip.generateAsync({ type: "blob" }).then(blobContent => {
      triggerDownload(blobContent, "peptidecutter_fasta_results.zip");
    }).catch(err => {
      console.error("FASTA ZIP creation failed", err);
      alert("Failed to create FASTA ZIP archive.");
    });
  };

  // Specificity modal export helpers
  const exportModalCSV = () => {
    if (!results) return;
    const showAll = !modalTargetKey || modalTargetKey === "all";
    const name = showAll ? "All active agents" : (ENZYME_SPECIFICITIES.find(e => e.key === modalTargetKey)?.name || modalTargetKey);
    const csvOutput = buildCSVForEnzyme(modalFilteredSites, results.sequence, name, modalLengthFilter, modalCustomMin, modalCustomMax);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, `${name.replace(/\s+/g, '_')}_results.csv`);
  };

  const exportModalExcel = () => {
    if (!results) return;
    if (typeof XLSX === "undefined") {
      alert("XLSX library is not loaded.");
      return;
    }
    const showAll = !modalTargetKey || modalTargetKey === "all";
    const name = showAll ? "All active agents" : (ENZYME_SPECIFICITIES.find(e => e.key === modalTargetKey)?.name || modalTargetKey);
    const wb = XLSX.utils.book_new();
    const rows = buildExcelRowsForEnzyme(modalFilteredSites, results.sequence, name, modalLengthFilter, modalCustomMin, modalCustomMax);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
    XLSX.writeFile(wb, `${name.replace(/\s+/g, '_')}_results.xlsx`);
  };

  const exportModalPDF = () => {
    if (!results) return;
    if (typeof jspdf === "undefined" || !jspdf.jsPDF) {
      alert("jsPDF library is not loaded.");
      return;
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape orientation
    const showAll = !modalTargetKey || modalTargetKey === "all";
    const name = showAll ? "All active agents" : (ENZYME_SPECIFICITIES.find(e => e.key === modalTargetKey)?.name || modalTargetKey);
    const peps = getPeptidesForEnzyme(modalFilteredSites, results.sequence);
    const filtered = filterPeptidesList(peps, modalLengthFilter, modalCustomMin, modalCustomMax);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${name} Cleavage Results`, 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total peptides: ${filtered.length}`, 14, 22);

    const headers = [["Position of cleavage site", "Name of cleaving enzyme(s)", "Resulting peptide sequence", "Peptide length [aa]", "Peptide mass [Da]"]];
    const rows = filtered.map(p => {
      const enzStr = p.enzymes.length > 0 ? p.enzymes.map(e => e.name).join(", ") : name;
      return [
        p.cleavagePosition,
        enzStr,
        p.sequence,
        `${p.length} aa`,
        p.mass || getPeptideMass(p.sequence)
      ];
    });

    doc.autoTable({
      head: headers,
      body: rows,
      startY: 28,
      theme: "striped",
      headStyles: { fillColor: [2, 132, 199] },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 }
      },
      margin: { left: 14, right: 14 }
    });

    doc.save(`${name.replace(/\s+/g, '_')}_results.pdf`);
  };

  const handleExplanationsLink = (e) => {
    e.preventDefault();
    setModalTargetKey("all");
    setModalLengthFilter("all");
    setModalCustomMin(customMin);
    setModalCustomMax(customMax);
    setModalOpen(true);
  };

  const handleEnzymeLink = (e, key) => {
    e.preventDefault();
    setModalTargetKey(key);
    setModalLengthFilter("all");
    setModalCustomMin(customMin);
    setModalCustomMax(customMax);
    setModalOpen(true);
  };

  return (
    <div className="p-4 w-full overflow-y-auto max-h-[calc(100vh-80px)]">
      <style>{`
        .peptide-bond {
          position: absolute;
          top: 0;
          bottom: 0;
          right: -1px;
          width: 2px;
          background: rgba(255, 255, 255, 0.08);
          z-index: 2;
          cursor: pointer;
          transition: background 0.15s, width 0.15s;
        }
        .peptide-bond:hover {
          background: rgba(147, 197, 253, 0.6);
          width: 4px;
          right: -2px;
        }
        .peptide-bond.cut {
          background: #ef4444; /* rose */
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
          width: 3px;
          right: -1.5px;
          z-index: 5;
          animation: pulseRed 2s infinite;
        }
        .peptide-bond.cut-chemical {
          background: #10b981; /* emerald */
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          width: 3px;
          right: -1.5px;
          z-index: 5;
          animation: pulseGreen 2s infinite;
        }
        .peptide-bond.cut-multi {
          background: #f59e0b; /* amber */
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
          width: 3px;
          right: -1.5px;
          z-index: 5;
        }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 4px rgba(239, 68, 68, 0.5); }
          50% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.9); }
        }
        @keyframes pulseGreen {
          0%, 100% { box-shadow: 0 0 4px rgba(16, 185, 129, 0.5); }
          50% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.9); }
        }
        .chart-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .chart-label {
          width: 200px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .chart-bar-wrap {
          flex: 1;
          background: #e5e7eb;
          height: 14px;
          border-radius: 4px;
          overflow: hidden;
        }
        .chart-bar {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chart-value {
          width: 40px;
          text-align: right;
          font-size: 0.8rem;
          font-weight: 600;
          color: #1f2937;
        }
      `}</style>

      {/* Header and Title */}
      <div className="flex items-center justify-between border-b pb-4 mb-5 border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
            <Scissors className="text-blue-600" size={24} />
            PeptideCutter Pro
          </h1>
          <p className="text-xs text-gray-500">
            Advanced In Silico Protein Cleavage Site Predictor & Digest Engine
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-xs text-red-700 rounded-md mb-4 flex items-start gap-2">
          <Info className="flex-shrink-0 mt-0.5" size={14} />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column - Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Project Explorer cards */}
          {projectItems.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800 mb-2 flex items-center justify-between">
                <span>📁 Project Explorer</span>
                <span className="text-xs font-normal text-gray-400">({projectItems.length} files)</span>
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {projectItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSequence(item.sequence);
                      setProteinMeta(item.meta);
                      setActiveProjectItemId(item.id);
                    }}
                    className={`flex-shrink-0 cursor-pointer border rounded-lg p-2.5 w-36 transition-all relative group ${
                      activeProjectItemId === item.id 
                        ? "border-blue-500 bg-blue-50/40" 
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <button
                      onClick={(e) => removeProjectItem(item.id, e)}
                      className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 hover:text-red-600 text-gray-400 transition-opacity p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                      {item.type}
                    </div>
                    <div className="text-xs font-semibold text-gray-700 truncate pr-3" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {item.sequence.length} aa
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Analyses Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-2 flex items-center justify-between">
              <span>🔄 Recent Peptide Analyses</span>
              {recentAnalyses.length > 0 && (
                <button
                  onClick={() => {
                    localStorage.removeItem("recent_peptide_analyses");
                    setRecentAnalyses([]);
                  }}
                  className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer focus:outline-none"
                >
                  Clear
                </button>
              )}
            </h2>
            {recentAnalyses.length > 0 ? (
              <div className="space-y-2">
                {recentAnalyses.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSequence(item.sequence);
                      setSelectedEnzymes(new Set(item.enzymes));
                      setResults(null);
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-blue-50/50 border border-gray-200 hover:border-blue-200 rounded-lg text-xs text-gray-700 font-medium text-left transition-all cursor-pointer focus:outline-none"
                  >
                    <span className="truncate pr-2 font-semibold text-slate-800">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-normal shrink-0">{item.enzymes.length} enzymes</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 italic text-xs border border-dashed border-gray-200 rounded-lg">
                No recent peptide analyses.
              </div>
            )}
          </div>

          {/* Protein Input Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">1. Protein Sequence Input</h2>
            <p className="text-xs text-gray-400 mb-3">Paste raw sequence data or single-letter FASTA format</p>
            
            <textarea
              rows={6}
              placeholder="Paste FASTA or raw sequence here (e.g. SERVELAT...)"
              value={sequence}
              onChange={(e) => {
                setSequence(e.target.value);
                setActiveProjectItemId(null);
              }}
              className="w-full border border-gray-300 rounded-lg p-3 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
            />
            
            <div className="flex justify-between items-center mt-2.5">
              <div className="flex gap-2">
                <button
                  onClick={handleCleanClick}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200"
                >
                  Clean
                </button>
                <button
                  onClick={() => { setSequence(""); setProteinMeta(null); setActiveProjectItemId(null); setResults(null); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200"
                >
                  Clear
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200"
                >
                  Upload PDB
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdb"
                  onChange={handlePDBUpload}
                  className="hidden"
                />
              </div>
              <button
                onClick={saveToProject}
                className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-0.5"
              >
                + Save to Project
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center mt-3 pt-3 border-t border-gray-100">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Examples:</span>
              <button onClick={() => loadExample("gapdh")} className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium transition-colors">
                GAPDH (P04406)
              </button>
              <button onClick={() => loadExample("insulin")} className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium transition-colors">
                Insulin (P01308)
              </button>
              <button onClick={() => loadExample("servelat")} className="text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium transition-colors">
                SERVELAT
              </button>
            </div>
          </div>

          {/* Enzyme Selection Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">2. Cleavage Enzymes & Chemicals</h2>
            <p className="text-xs text-gray-400 mb-3">Select the proteolytic agents and simulation rules</p>
            
            {/* Presets Row */}
            <div className="flex flex-wrap gap-1 mb-3 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              <button onClick={() => toggleAllEnzymes(true)} className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors">All</button>
              <button onClick={() => selectPreset("common")} className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors">Common</button>
              <button onClick={() => selectPreset("proteases")} className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors">Proteases</button>
              <button onClick={() => selectPreset("caspases")} className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors">Caspases</button>
              <button onClick={() => selectPreset("chemicals")} className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors">Chemicals</button>
              <button onClick={() => toggleAllEnzymes(false)} className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors">None</button>
            </div>

            {/* Enzyme tabs */}
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setEnzTab("proteases")}
                  className={`flex-1 text-center py-2 text-xs font-semibold ${enzTab === "proteases" ? "bg-white text-blue-600 border-r border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Proteases
                </button>
                <button
                  onClick={() => setEnzTab("caspases")}
                  className={`flex-1 text-center py-2 text-xs font-semibold ${enzTab === "caspases" ? "bg-white text-blue-600 border-r border-l border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Caspases
                </button>
                <button
                  onClick={() => setEnzTab("chemicals")}
                  className={`flex-1 text-center py-2 text-xs font-semibold ${enzTab === "chemicals" ? "bg-white text-blue-600 border-l border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Chemicals
                </button>
              </div>

              <div className="p-3">
                {/* Search box inside active tab */}
                <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2.5 py-1 mb-2 bg-gray-50">
                  <Search size={12} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Filter ${enzTab}...`}
                    value={enzymeSearch[enzTab]}
                    onChange={(e) => setEnzymeSearch({ ...enzymeSearch, [enzTab]: e.target.value })}
                    className="bg-transparent text-xs outline-none w-full py-0.5 text-gray-700"
                  />
                </div>

                {/* Enzyme checklist */}
                <div className="h-44 overflow-y-auto space-y-1 pr-1.5 scrollbar-thin">
                  {categorizedEnzymes[enzTab]
                    .filter(e => e.name.toLowerCase().includes(enzymeSearch[enzTab].toLowerCase()))
                    .map(enz => {
                      const isChecked = selectedEnzymes.has(enz.key);
                      return (
                        <label
                          key={enz.key}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer border select-none transition-all ${
                            isChecked 
                              ? "bg-blue-50/50 border-blue-200 text-blue-700 font-medium" 
                              : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEnzyme(enz.key)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span className="truncate" title={`${enz.name}: ${enz.description}`}>
                            {enz.name}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Sophisticated Probability Matrix Options */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Use statistical probability models</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sophisticatedToggle}
                    onChange={(e) => setSophisticatedToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {sophisticatedToggle && (
                <div className="space-y-3 pt-1 border-t border-gray-200/60">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Select Probability Model:</label>
                    <div className="flex gap-2">
                      {["both", "trypsin", "chymotrypsin"].map(m => (
                        <label
                          key={m}
                          className={`flex-1 text-center py-1 border rounded text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                            probabilityModel === m 
                              ? "bg-blue-600 border-blue-600 text-white" 
                              : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="probabilityModel"
                            value={m}
                            checked={probabilityModel === m}
                            onChange={() => setProbabilityModel(m)}
                            className="hidden"
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
                      <span>Min Probability Threshold:</span>
                      <span className="text-blue-600 font-bold">{minProbability}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={minProbability}
                      onChange={(e) => setMinProbability(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0% (All sites)</span>
                      <span>50%</span>
                      <span>100% (Strict)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Perform Digest Button */}
            <button
              onClick={handlePerformDigest}
              disabled={loadingDigest}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg shadow-sm text-sm mt-4 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {loadingDigest ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Simulating Digest...
                </>
              ) : (
                "Perform Cleavage Digest"
              )}
            </button>

          </div>
        </div>

        {/* Right Column - Results Display (7 Cols) */}
        <div className="lg:col-span-7">
          {!results ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm h-full flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-3">📊</span>
              <h3 className="text-base font-bold text-gray-800 mb-1">Awaiting Cleavage Parameters</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Please enter a protein sequence, select your enzymes/chemicals, and click "Perform Cleavage Digest" to see results.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Protein Metadata Card */}
              {proteinMeta && (
                <div className="bg-gradient-to-r from-blue-900 to-blue-950 border border-blue-900/60 rounded-xl p-4 text-white shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 text-8xl font-black select-none pointer-events-none -mr-4 -mb-4">
                    🧬
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600/80 backdrop-blur text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-blue-500/20">
                      {proteinMeta.accession}
                    </span>
                    <h3 className="text-sm font-bold truncate pr-5" title={proteinMeta.proteinName}>
                      {proteinMeta.proteinName}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2.5 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-[10px] text-blue-300 block uppercase font-medium">Organism</span>
                      <span className="font-semibold truncate block" title={proteinMeta.organism}>{proteinMeta.organism}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-300 block uppercase font-medium">Gene</span>
                      <span className="font-semibold block">{proteinMeta.geneName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-300 block uppercase font-medium">Length</span>
                      <span className="font-semibold block">{proteinMeta.length} aa</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cleavage Map card */}
              <div id="peptide-results-header" className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                
                {/* Header of results */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b pb-3 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">3. Cleavage Map & Results</h2>
                    <p className="text-[10px] text-gray-400">Hover/click highlighted bonds to inspect cleavage details</p>
                  </div>
                  
                  {/* Export Actions dropdown or row */}
                  <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    <button
                      onClick={exportCSV}
                      className="text-[10px] font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors flex items-center gap-0.5"
                    >
                      <Download size={10} /> CSV
                    </button>
                    <button
                      onClick={exportExcel}
                      className="text-[10px] font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors flex items-center gap-0.5"
                    >
                      <Download size={10} /> Excel
                    </button>
                    <button
                      onClick={exportPDF}
                      className="text-[10px] font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors flex items-center gap-0.5"
                    >
                      <Download size={10} /> PDF
                    </button>
                    <button
                      onClick={exportFASTA}
                      className="text-[10px] font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded transition-colors flex items-center gap-0.5"
                    >
                      <Download size={10} /> FASTA
                    </button>
                  </div>
                </div>

                {/* Cleavage Map legend */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 mb-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-3 bg-red-500 rounded-sm"></span> Protease Cut</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-3 bg-emerald-500 rounded-sm"></span> Chemical Cut</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-3 bg-amber-500 rounded-sm"></span> Multi-agent Cut</span>
                  </div>
                  <div>
                    <label className="font-semibold text-gray-500 mr-1.5">Block Size:</label>
                    <select
                      value={blockSize}
                      onChange={(e) => setBlockSize(parseInt(e.target.value))}
                      className="border border-gray-200 bg-white rounded px-1.5 py-0.5 outline-none font-semibold text-gray-600"
                    >
                      <option value={10}>10 aa</option>
                      <option value={20}>20 aa</option>
                      <option value={30}>30 aa</option>
                    </select>
                  </div>
                </div>

                {/* Cleavage Map sequence grid */}
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 max-h-72 overflow-y-auto mb-4 relative">
                  
                  {/* Tooltip Overlay */}
                  {tooltip && (
                    <div
                      className="absolute bg-white border border-gray-200 text-gray-800 p-2.5 rounded-lg shadow-xl text-[11px] z-50 pointer-events-auto leading-relaxed border-l-4 border-l-blue-600 min-w-44"
                      style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y - 10}px`,
                        transform: "translate(-50%, -100%)"
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div className="font-bold border-b border-gray-100 pb-1 mb-1 text-gray-700 flex justify-between gap-2">
                        <span>Position {tooltip.position}</span>
                        <span className="text-blue-600">{tooltip.cuts[0].p1} ✂ {tooltip.cuts[0].p1_prime}</span>
                      </div>
                      <div className="space-y-0.5">
                        {tooltip.cuts.map((c, i) => {
                          const isProb = ["Tryps", "Ch_hi", "Ch_lo"].includes(c.enzymeKey);
                          return (
                            <div key={i} className="text-gray-600 font-medium">
                              • {c.enzymeName}{isProb ? ` (${c.probability}%)` : ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 font-mono select-text">
                    {(() => {
                      const lines = [];
                      const seq = filteredResults.sequence;
                      const N = seq.length;
                      for (let start = 0; start < N; start += blockSize) {
                        const end = Math.min(start + blockSize, N);
                        
                        // Index row (e.g. 1, 10, 20...)
                        const indices = [];
                        for (let p = start; p < end; p++) {
                          const showIdx = p === start || (p + 1) % 10 === 0;
                          indices.push(
                            <span
                              key={p}
                              className={`inline-block text-[10px] font-bold text-gray-400/80 text-center relative ${
                                (p + 1) % 10 === 0 && p + 1 < end ? "mr-3" : "mr-1"
                              }`}
                              style={{ width: "14px" }}
                            >
                              {showIdx ? p + 1 : ""}
                            </span>
                          );
                        }

                        // Residue Characters row
                        const chars = [];
                        for (let p = start; p < end; p++) {
                          const char = seq[p];
                          const cuts = cleavageSitesMap[p];
                          
                          let bondClass = "peptide-bond";
                          if (cuts && cuts.length > 0) {
                            const hasChem = cuts.some(c => enzymes.find(e => e.key === c.enzymeKey)?.type === "chemical");
                            const hasEnz = cuts.some(c => enzymes.find(e => e.key === c.enzymeKey)?.type === "enzyme");
                            if (hasChem && hasEnz) bondClass += " cut-multi";
                            else if (hasChem) bondClass += " cut-chemical";
                            else bondClass += " cut";
                          }

                          const handleMouseEnter = (e) => {
                            if (!cuts || cuts.length === 0) return;
                            const rect = e.target.getBoundingClientRect();
                            const parentRect = e.target.offsetParent.getBoundingClientRect();
                            setTooltip({
                              x: rect.left - parentRect.left + rect.width / 2,
                              y: rect.top - parentRect.top,
                              cuts,
                              position: p + 1
                            });
                          };

                          chars.push(
                            <span
                              key={p}
                              className={`inline-block relative text-center text-sm font-semibold text-gray-700 bg-white rounded border border-gray-200/50 shadow-sm ${
                                (p + 1) % 10 === 0 && p + 1 < end ? "mr-3" : "mr-1"
                              }`}
                              style={{ width: "14px", height: "22px", lineHeight: "20px" }}
                            >
                              {char}
                              {p < N - 1 && (
                                <span
                                  className={bondClass}
                                  onMouseEnter={handleMouseEnter}
                                  onClick={handleMouseEnter}
                                />
                              )}
                            </span>
                          );
                        }

                        lines.push(
                          <div key={start} className="flex flex-col">
                            <div className="flex leading-none">{indices}</div>
                            <div className="flex leading-none mt-0.5">{chars}</div>
                          </div>
                        );
                      }
                      return lines;
                    })()}
                  </div>
                </div>

                {/* Display Frequency Filter Options Panel */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 text-xs">
                  <span className="font-semibold text-gray-600">Map Frequency Filters:</span>
                  <select
                    value={frequencyFilter}
                    onChange={(e) => setFrequencyFilter(e.target.value)}
                    className="border border-gray-300 rounded px-2.5 py-1 outline-none bg-white text-gray-700 font-medium w-40"
                  >
                    <option value="all">Display All Sites</option>
                    <option value="exactly">Cleaving Exactly...</option>
                    <option value="range">Cleaving in Range...</option>
                  </select>

                  {frequencyFilter === "exactly" && (
                    <div className="flex items-center gap-1.5">
                      <span>Exactly</span>
                      <input
                        type="number"
                        min={0}
                        value={filterExactlyVal}
                        onChange={(e) => setFilterExactlyVal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 border border-gray-300 rounded px-2 py-0.5 text-center font-bold outline-none"
                      />
                      <span>times</span>
                    </div>
                  )}

                  {frequencyFilter === "range" && (
                    <div className="flex items-center gap-1.5">
                      <span>Between</span>
                      <input
                        type="number"
                        min={0}
                        value={filterMinVal}
                        onChange={(e) => setFilterMinVal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 border border-gray-300 rounded px-2 py-0.5 text-center font-bold outline-none"
                      />
                      <span>and</span>
                      <input
                        type="number"
                        min={0}
                        value={filterMaxVal}
                        onChange={(e) => setFilterMaxVal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 border border-gray-300 rounded px-2 py-0.5 text-center font-bold outline-none"
                      />
                      <span>times</span>
                    </div>
                  )}
                </div>

                {/* Result length filters panel */}
                <div className="flex flex-wrap items-center gap-4 bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 mb-5">
                  <span className="font-semibold flex items-center gap-1">
                    <Info size={14} className="text-blue-500" />
                    Resulting Peptide Length Options:
                  </span>
                  
                  <select
                    value={lengthFilter}
                    onChange={(e) => { setLengthFilter(e.target.value); setCustomMin(""); setCustomMax(""); }}
                    className="border border-blue-200 rounded-lg px-2.5 py-1.5 bg-white font-medium outline-none text-blue-950 focus:ring-1 focus:ring-blue-400 w-44"
                  >
                    <option value="all">All Sequences</option>
                    <option value="group">Group by Length</option>
                    <option value="below">below {t1}</option>
                    <option value="range1">above {t1} to {t2}</option>
                    <option value="range2">above {t2 + 1} to {t3}</option>
                    <option value="above">above {t3 + 1}+</option>
                  </select>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-gray-500 font-medium">Custom Range:</span>
                    <input
                      type="number"
                      placeholder="Min"
                      min={1}
                      value={customMin}
                      onChange={(e) => { setCustomMin(e.target.value); setLengthFilter("all"); }}
                      className="w-14 border border-blue-200 rounded px-2 py-1 outline-none text-center bg-white"
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      min={1}
                      value={customMax}
                      onChange={(e) => { setCustomMax(e.target.value); setLengthFilter("all"); }}
                      className="w-14 border border-blue-200 rounded px-2 py-1 outline-none text-center bg-white"
                    />
                  </div>
                </div>

                {/* Result Views Tabs */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex border-b border-gray-200 bg-gray-50">
                    {["sequential", "alphabetical", "fragments", "chart"].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-center py-2.5 text-xs font-bold transition-all capitalize border-r border-gray-200 last:border-r-0 ${
                          activeTab === tab 
                            ? "bg-white text-blue-700 shadow-sm" 
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {tab} {tab === "chart" ? "Chart" : "Table"}
                      </button>
                    ))}
                  </div>

                  <div className="p-3.5 max-h-[400px] overflow-y-auto scrollbar-thin">
                    
                    {/* Tab: Sequential Table */}
                    {activeTab === "sequential" && (
                      <table className="min-w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-500">
                            <th className="py-2 px-3">Position</th>
                            <th className="py-2 px-3">Enzyme(s)</th>
                            <th className="py-2 px-3">Peptide Sequence</th>
                            <th className="py-2 px-3">Length</th>
                            <th className="py-2 px-3">Mass</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSequentialPeptides.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-gray-400">
                                No cleavage sites/peptides match current filters.
                              </td>
                            </tr>
                          ) : (
                            filteredSequentialPeptides.map((pep, i) => {
                              const enzStr = pep.enzymes.length > 0 
                                ? pep.enzymes.map(e => e.name).join(", ") 
                                : "-";
                              return (
                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                  <td className="py-2 px-3 font-semibold text-gray-600">{pep.cleavagePosition}</td>
                                  <td className="py-2 px-3 font-medium text-blue-600">
                                    {pep.enzymes.length > 0 ? (
                                      pep.enzymes.map((enz, idx) => (
                                        <React.Fragment key={enz.key}>
                                          {idx > 0 && ", "}
                                          <a
                                            href={`#${enz.key}`}
                                            onClick={(e) => handleEnzymeLink(e, enz.key)}
                                            className="hover:underline"
                                          >
                                            {enz.name}
                                          </a>
                                        </React.Fragment>
                                      ))
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono break-all leading-normal max-w-xs md:max-w-md">
                                    {pep.sequence}{" "}
                                    <a
                                      href="#explanations"
                                      onClick={handleExplanationsLink}
                                      className="text-gray-400 hover:text-blue-500 transition-colors ml-1 inline-block"
                                      title="See cleavage explanation model details"
                                    >
                                      <HelpCircle size={11} className="inline" />
                                    </a>
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-gray-700">{pep.length} aa</td>
                                  <td className="py-2 px-3 text-gray-500 font-medium">{pep.mass}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}

                    {/* Tab: Alphabetical Table */}
                    {activeTab === "alphabetical" && (
                      <table className="min-w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-500">
                            <th className="py-2 px-3">Enzyme / Chemical</th>
                            <th className="py-2 px-3">Cleavages Count</th>
                            <th className="py-2 px-3">Positions (1-indexed)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alphabeticalSummary.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-gray-400">
                                No cleavage sites detected.
                              </td>
                            </tr>
                          ) : (
                            alphabeticalSummary.map(s => {
                              const posList = filteredResults.cleavageSites
                                .filter(site => site.enzymeKey === s.key)
                                .map(site => site.position)
                                .sort((a, b) => a - b);
                              return (
                                <tr key={s.key} className="border-b border-gray-100 hover:bg-gray-50/50">
                                  <td className="py-2.5 px-3 font-bold text-gray-700">
                                    <a
                                      href={`#${s.key}`}
                                      onClick={(e) => handleEnzymeLink(e, s.key)}
                                      className="hover:underline text-blue-600"
                                    >
                                      {s.name}
                                    </a>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-900">{s.cleavagesCount}</td>
                                  <td className="py-2.5 px-3 text-gray-500 font-mono tracking-wider break-all max-w-sm">
                                    {posList.length > 0 ? posList.join(", ") : "-"}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}

                    {/* Tab: Peptide Fragments */}
                    {activeTab === "fragments" && (
                      <table className="min-w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-500">
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Range</th>
                            <th className="py-2 px-3">Length</th>
                            <th className="py-2 px-3">Average Mass</th>
                            <th className="py-2 px-3">Sequence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredResults.fragments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-gray-400">No fragments found.</td>
                            </tr>
                          ) : (
                            filteredResults.fragments.map((frag, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="py-2 px-3 font-semibold text-gray-400">{frag.index}</td>
                                <td className="py-2 px-3 font-semibold text-gray-700">{frag.start} - {frag.end}</td>
                                <td className="py-2 px-3 font-bold text-gray-900">{frag.length} aa</td>
                                <td className="py-2 px-3 text-gray-500 font-medium">
                                  {frag.mass ? `${frag.mass} Da` : "Contains unknown aa"}
                                </td>
                                <td className="py-2 px-3 font-mono break-all text-gray-600 max-w-xs">{frag.sequence}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}

                    {/* Tab: Frequency Chart */}
                    {activeTab === "chart" && (
                      <div className="space-y-1.5 py-2">
                        {activeChartSummary.length === 0 ? (
                          <p className="text-center text-gray-400 py-6">
                            No cleavage sites detected. Chart is empty.
                          </p>
                        ) : (
                          (() => {
                            const maxVal = Math.max(...activeChartSummary.map(b => b.cleavagesCount));
                            return activeChartSummary.map(bar => {
                              const percent = maxVal > 0 ? (bar.cleavagesCount / maxVal) * 100 : 0;
                              return (
                                <div key={bar.key} className="chart-row">
                                  <div className="chart-label" title={bar.name}>{bar.name}</div>
                                  <div className="chart-bar-wrap">
                                    <div className="chart-bar" style={{ width: `${percent}%` }}></div>
                                  </div>
                                  <div className="chart-value">{bar.cleavagesCount}</div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    )}

                  </div>
                </div>

              </div>

              {/* Reference specification table card */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-800 mb-1">Enzyme & Chemical Cleavage Specifications</h2>
                <p className="text-[10px] text-gray-400 mb-4">Comprehensive rule database detailing cleavage requirements, exclusions, and descriptions</p>
                
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-sm w-full sm:w-80">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search rules database (e.g. Pepsin, Trypsin)..."
                      value={refSearchQuery}
                      onChange={(e) => setRefSearchQuery(e.target.value)}
                      className="bg-transparent text-xs outline-none w-full text-gray-700"
                    />
                  </div>

                  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setRefFilterType("all")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                        refFilterType === "all"
                          ? "bg-white text-blue-700 shadow-sm border border-gray-200/60"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setRefFilterType("enzyme")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                        refFilterType === "enzyme"
                          ? "bg-white text-blue-700 shadow-sm border border-gray-200/60"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Proteases
                    </button>
                    <button
                      onClick={() => setRefFilterType("chemical")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                        refFilterType === "chemical"
                          ? "bg-white text-blue-700 shadow-sm border border-gray-200/60"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      Chemicals
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-200 rounded-lg scrollbar-thin">
                  <table className="min-w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-500">
                        <th className="py-2 px-3">Enzyme / Chemical</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Cleavage Specificity Rule</th>
                        <th className="py-2 px-3">Description / Exceptions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSpecs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-gray-400">
                            No matching cleavage rules found.
                          </td>
                        </tr>
                      ) : (
                        filteredSpecs.map((enz, index) => {
                          const typeLabel = enz.type === "chemical" ? "Chemical" : "Protease";
                          const typeClass = enz.type === "chemical" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : "bg-purple-50 text-purple-700 border border-purple-200";
                          return (
                            <tr key={`${enz.key}-${index}`} className="border-b border-gray-100 hover:bg-gray-50/50">
                              <td className="py-2.5 px-3 font-semibold text-gray-700">
                                <strong>
                                  <a
                                    href={`https://web.expasy.org/peptide_cutter/peptidecutter_enzymes.html#${enz.key}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {enz.name}
                                  </a>
                                </strong>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeClass}`}>
                                  {typeLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-sky-700 font-mono">
                                {formatRuleSummary(enz)}
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 font-medium leading-normal text-[11px]">
                                {enz.description}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Specificity Details Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold">
                  {modalTargetKey === "all" 
                    ? "Peptide Cleavage Results (All active agents)" 
                    : `${ENZYME_SPECIFICITIES.find(e => e.key === modalTargetKey)?.name || modalTargetKey} Cleavage Results`
                  }
                </h2>
                <p className="text-[10px] text-blue-200 mt-0.5">
                  {modalTargetKey === "all" 
                    ? "Peptide fragments resulting from cleavage by all selected proteolytic agents." 
                    : `Peptide fragments resulting from cleavage by ${ENZYME_SPECIFICITIES.find(e => e.key === modalTargetKey)?.name || modalTargetKey}`
                  }
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-white/80 hover:text-white font-bold text-xl hover:scale-110 transition-transform px-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Modal Length Options Panel */}
              <div className="flex flex-wrap items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-700">
                <span className="font-semibold">Resulting Peptide Length Options:</span>
                
                <select
                  value={modalLengthFilter}
                  onChange={(e) => { setModalLengthFilter(e.target.value); setModalCustomMin(""); setModalCustomMax(""); }}
                  className="border border-gray-300 rounded px-2.5 py-1 bg-white font-semibold outline-none text-gray-600 focus:ring-1 focus:ring-blue-400"
                >
                  <option value="all">All Sequences</option>
                  <option value="below">below {t1}</option>
                  <option value="range1">above {t1} to {t2}</option>
                  <option value="range2">above {t2 + 1} to {t3}</option>
                  <option value="above">above {t3 + 1}+</option>
                </select>

                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-gray-500 font-semibold">Custom Range:</span>
                  <input
                    type="number"
                    placeholder="Min"
                    min={1}
                    value={modalCustomMin}
                    onChange={(e) => { setModalCustomMin(e.target.value); setModalLengthFilter("all"); }}
                    className="w-14 border border-gray-300 rounded px-2 py-0.5 outline-none text-center bg-white"
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    min={1}
                    value={modalCustomMax}
                    onChange={(e) => { setModalCustomMax(e.target.value); setModalLengthFilter("all"); }}
                    className="w-14 border border-gray-300 rounded px-2 py-0.5 outline-none text-center bg-white"
                  />
                </div>
              </div>

              {/* Modal Table content */}
              <div className="border border-gray-200 rounded-xl overflow-hidden scrollbar-thin">
                <table className="min-w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-500">
                      <th className="py-2 px-3">Position</th>
                      <th className="py-2 px-3">Enzyme(s)</th>
                      <th className="py-2 px-3">Peptide Sequence</th>
                      <th className="py-2 px-3">Length</th>
                      <th className="py-2 px-3">Mass</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalPeptides.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">
                          No peptides match criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredModalPeptides.map((pep, i) => {
                        const enzStr = pep.enzymes.length > 0 
                          ? pep.enzymes.map(e => e.name).join(", ") 
                          : (ENZYME_SPECIFICITIES.find(e => e.key === modalTargetKey)?.name || modalTargetKey);
                        return (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-semibold text-gray-600">{pep.cleavagePosition}</td>
                            <td className="py-2 px-3 font-semibold text-blue-600">{pep.cleavagePosition !== "-" ? enzStr : "-"}</td>
                            <td className="py-2 px-3 font-mono break-all leading-normal max-w-sm">{pep.sequence}</td>
                            <td className="py-2 px-3 font-semibold text-gray-700">{pep.length} aa</td>
                            <td className="py-2 px-3 text-gray-500 font-medium">{pep.mass}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={exportModalCSV}
                  className="text-xs font-bold border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Download size={12} /> CSV
                </button>
                <button
                  onClick={exportModalExcel}
                  className="text-xs font-bold border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Download size={12} /> Excel
                </button>
                <button
                  onClick={exportModalPDF}
                  className="text-xs font-bold border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
                >
                  <Download size={12} /> PDF
                </button>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
