const express = require("express");
const router = express.Router();
const axios = require("axios");
const { ENZYMES, calculateProbability } = require("../services/peptideCutterRules");

// Standard Amino Acid Average Masses (residue mass, subtract water H2O except for the free ends)
const AA_MASSES = {
  A: 71.08, R: 156.19, N: 114.10, D: 115.09, C: 103.14,
  E: 129.12, Q: 128.13, G: 57.05, H: 137.14, I: 113.16,
  L: 113.16, K: 128.17, M: 131.19, F: 147.18, P: 97.12,
  S: 87.08, T: 101.11, W: 186.21, Y: 163.18, V: 99.13
};

// Authentication Lock Middleware specific to PeptideCutter
router.use((req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Access denied. Please login to use the Peptide Cutter." });
  }
  next();
});

// Get all available enzymes & chemicals metadata
router.get("/enzymes", (req, res) => {
  const metadata = ENZYMES.map(e => ({
    key: e.key,
    name: e.name,
    type: e.type,
    description: e.description
  }));
  res.json(metadata);
});

// Fetch sequence and metadata from UniProt API
router.get("/uniprot/:accession", async (req, res) => {
  const { accession } = req.params;
  const cleanAccession = accession.trim().toUpperCase();

  if (!cleanAccession) {
    return res.status(400).json({ error: "Accession ID is required" });
  }

  try {
    // Attempt to fetch full JSON details from UniProt REST API using axios
    try {
      const response = await axios.get(`https://rest.uniprot.org/uniprotkb/${cleanAccession}.json`, {
        timeout: 10000
      });
      if (response.status === 200) {
        const data = response.data;
        const sequence = data.sequence?.value || "";
        const proteinName = data.proteinDescription?.recommendedName?.fullName?.value || 
                            data.proteinDescription?.submissionNames?.[0]?.fullName?.value || 
                            "Unknown Protein";
        const geneName = data.genes?.[0]?.geneName?.value || "N/A";
        const organism = data.organism?.scientificName || "Unknown Organism";
        
        return res.json({
          accession: cleanAccession,
          sequence,
          proteinName,
          geneName,
          organism,
          success: true
        });
      }
    } catch (jsonErr) {
      // If JSON API fails (e.g. 404), fall back to FASTA endpoint
      if (jsonErr.response?.status !== 404) {
        console.warn("UniProt JSON fetch error, trying FASTA fallback:", jsonErr.message);
      }
    }

    // Fallback: Attempt to fetch FASTA
    const fastaResponse = await axios.get(`https://rest.uniprot.org/uniprotkb/${cleanAccession}.fasta`, {
      timeout: 10000
    });
    if (fastaResponse.status === 200) {
      const fastaText = fastaResponse.data;
      const lines = fastaText.split("\n");
      const header = lines[0] || "";
      const sequence = lines.slice(1).join("").replace(/\s/g, "");
      
      // Parse header details: e.g. >sp|P04406|G3P_HUMAN Glyceraldehyde-3-phosphate dehydrogenase OS=Homo sapiens...
      let proteinName = "Unknown Protein";
      let organism = "Unknown Organism";
      const nameMatch = header.match(/>.*?\s(.*?)\sOS=/);
      if (nameMatch) proteinName = nameMatch[1];
      const osMatch = header.match(/OS=(.*?)\sGN=/);
      if (osMatch) organism = osMatch[1];

      return res.json({
        accession: cleanAccession,
        sequence,
        proteinName,
        geneName: "N/A",
        organism,
        success: true
      });
    }

    return res.status(404).json({ error: `UniProt entry "${cleanAccession}" not found.` });
  } catch (error) {
    console.error("UniProt fetch error:", error.message);
    return res.status(500).json({ error: "Failed to connect to UniProt services." });
  }
});

// Perform in silico peptide cleavage
router.post("/cleave", (req, res) => {
  const { sequence, enzymes, minProbability = 0, probabilityModel = "both" } = req.body;

  if (!sequence || typeof sequence !== "string") {
    return res.status(400).json({ error: "A valid protein sequence string is required." });
  }

  const cleanSeq = sequence.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleanSeq.length === 0) {
    return res.status(400).json({ error: "Protein sequence contains no valid amino acids." });
  }

  // If no enzymes selected, select all
  const selectedKeys = Array.isArray(enzymes) && enzymes.length > 0 
    ? enzymes 
    : ENZYMES.map(e => e.key);

  const selectedEnzymes = ENZYMES.filter(e => selectedKeys.includes(e.key));

  const cleavageSites = [];
  const freqMap = {};
  selectedKeys.forEach(k => freqMap[k] = 0);

  // Cleavage logic
  const N = cleanSeq.length;
  for (let i = 0; i < N - 1; i++) {
    const p4 = i >= 3 ? cleanSeq[i - 3] : "";
    const p3 = i >= 2 ? cleanSeq[i - 2] : "";
    const p2 = i >= 1 ? cleanSeq[i - 1] : "";
    const p1 = cleanSeq[i];
    const p1_prime = cleanSeq[i + 1];
    const p2_prime = i + 2 < N ? cleanSeq[i + 2] : "";

    selectedEnzymes.forEach(enzyme => {
      const cuts = enzyme.cleave(p4, p3, p2, p1, p1_prime, p2_prime);
      
      if (cuts) {
        const prob = calculateProbability(enzyme.key, p4, p3, p2, p1, p1_prime, p2_prime);
        const isTryps = enzyme.key === "Tryps";
        const isChymo = ["Ch_hi", "Ch_lo"].includes(enzyme.key);
        
        let applyThreshold = false;
        if (probabilityModel === "both") {
          applyThreshold = isTryps || isChymo;
        } else if (probabilityModel === "trypsin") {
          applyThreshold = isTryps;
        } else if (probabilityModel === "chymotrypsin") {
          applyThreshold = isChymo;
        }

        if (!applyThreshold || prob >= minProbability) {
          cleavageSites.push({
            position: i + 1, // 1-based index of residue before cleavage
            p1: p1,
            p1_prime: p1_prime,
            enzymeKey: enzyme.key,
            enzymeName: enzyme.name,
            probability: prob
          });
          freqMap[enzyme.key] = (freqMap[enzyme.key] || 0) + 1;
        }
      }
    });
  }

  // Calculate resulting fragments
  const cutPositions = Array.from(new Set(cleavageSites.map(s => s.position))).sort((a, b) => a - b);
  const fragments = [];
  let prevPos = 0;

  const addFragment = (startIdx, endIdx) => {
    const fragSeq = cleanSeq.substring(startIdx, endIdx);
    if (fragSeq.length === 0) return;

    let mass = 18.015;
    let unknownResidues = 0;
    for (let char of fragSeq) {
      if (AA_MASSES[char]) {
        mass += AA_MASSES[char];
      } else {
        unknownResidues++;
      }
    }

    fragments.push({
      index: fragments.length + 1,
      start: startIdx + 1,
      end: endIdx,
      length: fragSeq.length,
      sequence: fragSeq,
      mass: unknownResidues === 0 ? parseFloat(mass.toFixed(3)) : null,
      hasUnknownResidues: unknownResidues > 0
    });
  };

  cutPositions.forEach(pos => {
    addFragment(prevPos, pos);
    prevPos = pos;
  });
  addFragment(prevPos, N);

  res.json({
    sequence: cleanSeq,
    length: N,
    cleavageSites,
    fragments,
    summary: selectedEnzymes.map(e => ({
      key: e.key,
      name: e.name,
      type: e.type,
      cleavagesCount: freqMap[e.key] || 0
    })),
    success: true
  });
});

module.exports = router;
