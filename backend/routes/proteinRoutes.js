// backend/routes/proteinRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { getProteinOverview } = require("../services/proteinOverview");
const { getProteinFunction } = require("../services/proteinFunction");
const { getProteinSubcellular } = require("../services/proteinSubcellular");
const { getProteinDisease } = require("../services/proteinDisease");
const { getProteinPTM } = require("../services/proteinPTM");
const { getProteinExpression } = require("../services/proteinExpression");
const { getProteinInteraction } = require("../services/proteinInteraction");
const { getProteinDomains } = require("../services/proteinDomains");
const { getProteinSequence } = require("../services/proteinSequence");
const { getProteinStructure } = require("../services/proteinStructure");
const { getProteinPublications } = require("../services/proteinPublications");
const { getProteinCrossrefs } = require("../services/proteinCrossrefs");
const { getProteinSimilar } = require("../services/proteinSimilar");

// ====================== RETRY CONFIG ======================
axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => retryCount * 1500,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkError(error) ||
      axiosRetry.isRetryableError(error) ||
      error.response?.status === 500 ||
      error.response?.status === 501 ||
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504 ||
      error.response?.status === 429
    );
  },
  onRetry: (retryCount, error) => {
    console.log(`[Protein] Retry ${retryCount} — HTTP ${error.response?.status || error.message}`);
  },
});

const BASE_URL = "https://rest.uniprot.org/uniprotkb/search";

const organismMap = {
  human: "organism_id:9606",
  mouse: "organism_id:10090",
  rat: "organism_id:10116",
  bacteria: "taxonomy_id:2",
  plants: "taxonomy_id:33090",
  yeast: "organism_id:559292",
  zebrafish: "organism_id:7955",
};

const isAccessionId = (q) => {
  const trimmed = q.trim();
  const isAcc = /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(trimmed);
  const isEntryName = /^[A-Z0-9]{1,12}_[A-Z0-9]{1,12}$/i.test(trimmed);
  return isAcc || isEntryName;
};

const USER_ERRORS = {
  search: "Protein search is temporarily unavailable. Please try again in a moment.",
  download: "Download is temporarily unavailable. Please try again.",
  details: "Unable to load protein details right now. Please try again.",
  section: "This section is temporarily unavailable.",
  timeout: "The request took too long. Try a more specific search or use an Accession ID for faster results.",
  overload: "The database is currently busy. Please try a more specific search term or use an Accession ID.",
};

// ── Helper: parse all gene names from an entry ──────────────────────────────
// The API returns gene data in TWO places depending on the fields requested:
//   1. entry.genes[]  — structured array (only present when "genes" field requested)
//   2. entry.geneNames — flat space-separated string (present when "gene_names" field requested)
// We request "gene_names" which gives us the flat string. Parse it directly.
function parseGenes(entry) {
  // Method 1: structured genes array (geneName + synonyms + ORF + orderedLocus)
  if (entry.genes && entry.genes.length > 0) {
    const fromStructured = entry.genes
      .map(g => [
        g.geneName?.value,
        ...(g.synonyms || []).map(s => s.value),
        ...(g.orfNames || []).map(o => o.value),
        ...(g.orderedLocusNames || []).map(o => o.value),
      ].filter(Boolean))
      .flat();
    if (fromStructured.length > 0) return fromStructured;
  }

  // Method 2: flat geneNames string — split on spaces (the API uses space as separator)
  // e.g. "SUC4 SUT4 At1g09960 F21M12.35" or just "INS"
  if (entry.geneNames && typeof entry.geneNames === "string") {
    const parts = entry.geneNames
      .trim()
      .split(/\s+/)
      .map(g => g.trim())
      .filter(g => g.length > 0);
    if (parts.length > 0) return parts;
  }

  return [];
}

// ====================== HEALTH CHECK ======================
router.get("/health", (req, res) => {
  res.json({ success: true, message: "Protein routes active" });
});

// ====================== SEARCH ======================
router.get("/search", async (req, res) => {
  try {
    let {
      query = "",
      status = "any",
      organism = "all",
      limit = 5,
      cursor = null,
    } = req.query;

    limit = parseInt(limit);
    if (isNaN(limit) || limit < 1) limit = 5;
    if (limit > 25) limit = 25;

    const trimmed = query.trim();
    const accessionSearch = isAccessionId(trimmed);

    let searchQuery;

    if (accessionSearch) {
      if (/^[A-Z0-9]{1,12}_[A-Z0-9]{1,12}$/i.test(trimmed)) {
        searchQuery = `id:${trimmed}`;
      } else {
        searchQuery = `accession:${trimmed}`;
      }
      console.log(`[Protein] Accession/ID lookup: ${trimmed} -> ${searchQuery}`);
    } else {
      searchQuery = trimmed || "*";
      const filters = [];

      if (status === "reviewed") {
        filters.push("reviewed:true");
      } else if (status === "unreviewed") {
        filters.push("reviewed:false");
      } else {
        // keyword searches always enforce reviewed/unreviewed via modal
        // "any" fallback defaults to reviewed to prevent timeout on huge sets
        filters.push("reviewed:true");
      }

      if (organism !== "all" && organismMap[organism]) {
        filters.push(organismMap[organism]);
      }

      if (filters.length > 0) {
        searchQuery += ` AND ${filters.join(" AND ")}`;
      }

      console.log(`[Protein] Keyword search: "${searchQuery}" | status=${status} | organism=${organism} | cursor=${cursor ? "yes" : "no"}`);
    }

    let response;

    if (cursor) {
      response = await axios.get(cursor, {
        timeout: 30000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ChemVault-ProteinSearch/1.0",
        },
      });
    } else {
      response = await axios.get(BASE_URL, {
        params: {
          query: searchQuery,
          format: "json",
          size: limit,
          // NOTE: "gene_names" returns flat geneNames string on entry
          //       "genes" is NOT a valid field name — do NOT add it
          fields: "accession,id,protein_name,gene_names,organism_name,organism_id,length,reviewed",
        },
        timeout: 30000,
        headers: {
          Accept: "application/json",
          "User-Agent": "ChemVault-ProteinSearch/1.0",
        },
      });
    }

    const rawTotal = parseInt(response.headers["x-total-results"] || "0") || 0;
    const MAX_DISPLAY = 2500000;
    const totalResults = Math.min(rawTotal, MAX_DISPLAY);
    const isCapped = rawTotal > MAX_DISPLAY;

    let nextCursor = null;
    const linkHeader = response.headers["link"];
    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (match) nextCursor = match[1];
    }

    const proteins = (response.data.results || []).map((entry) => {

      // ── Protein Names ────────────────────────────────────────
      const recommended = entry.proteinDescription?.recommendedName?.fullName?.value || "";

      const ecNumbers = (entry.proteinDescription?.recommendedName?.ecNumbers || [])
        .map(e => e.value).filter(Boolean);

      const altNames = (entry.proteinDescription?.alternativeNames || [])
        .map(a => a.fullName?.value).filter(Boolean);

      const cleavedProducts = (entry.proteinDescription?.contains || [])
        .map(c => c.recommendedName?.fullName?.value).filter(Boolean);

      let fullProteinName = recommended;
      if (ecNumbers.length) fullProteinName += `, ${ecNumbers.join(", ")}`;
      if (altNames.length) fullProteinName += `, ${altNames.join(", ")}`;
      if (cleavedProducts.length) fullProteinName += `, Cleaved into: ${cleavedProducts.join(", ")}`;
      if (!fullProteinName) {
        fullProteinName =
          entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
          "Unknown Protein";
      }

      const allProteinNames = [
        recommended,
        ...ecNumbers.map(e => `EC ${e}`),
        ...altNames,
        ...cleavedProducts.map(c => `Cleaved into: ${c}`),
      ].filter(Boolean);

      // ── Gene Names ───────────────────────────────────────────
      const allGenes = parseGenes(entry);

      // ── Organism ─────────────────────────────────────────────
      const sciName = entry.organism?.scientificName || "";
      const commonName = entry.organism?.commonName || "";
      const synonymNames = entry.organism?.synonyms || [];
      const allCommonNames = [
        ...(commonName ? [commonName] : []),
        ...synonymNames,
      ];
      const fullOrganism = allCommonNames.length
        ? `${sciName} (${allCommonNames.join(") (")})`
        : sciName || "N/A";

      // Debug log — remove after confirming genes work
      console.log(`[Gene] ${entry.primaryAccession} | geneNames="${entry.geneNames}" | parsed=${JSON.stringify(allGenes)}`);

      return {
        accession: entry.primaryAccession || "N/A",
        entryName: entry.uniProtkbId || "N/A",
        proteinName: fullProteinName || "Unknown Protein",
        allProteinNames,
        gene: allGenes[0] || "—",
        allGenes,
        organism: fullOrganism,
        length: entry.sequence?.length || "N/A",
        status: entry.entryType?.includes("Swiss-Prot") ? "Reviewed" : "Unreviewed",
      };
    });

    console.log(
      `[Protein] ✅ ${proteins.length} results | rawTotal=${rawTotal} | capped=${isCapped} | hasMore=${!!nextCursor}`
    );

    res.json({
      success: true,
      total: totalResults,
      rawTotal,
      isCapped,
      results: proteins,
      nextCursor,
      hasMore: !!nextCursor,
      isAccessionSearch: accessionSearch,
    });

  } catch (error) {
    console.error("[Protein] Search error:", error.message);
    if (error.response) {
      console.error("[Protein] HTTP status:", error.response.status);
      console.error("[Protein] Response body:", JSON.stringify(error.response.data)?.slice(0, 300));
    }

    const status = error.response?.status;
    let userMessage = USER_ERRORS.search;
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      userMessage = USER_ERRORS.timeout;
    } else if (status === 500 || status === 503 || status === 502) {
      userMessage = USER_ERRORS.overload;
    }

    res.status(500).json({
      success: false,
      error: userMessage,
    });
  }
});

// ====================== DOWNLOAD (FASTA / TEXT) ======================
router.get("/download", async (req, res) => {
  try {
    const { accessions, format = "fasta" } = req.query;
    if (!accessions) return res.status(400).json({ error: "Accessions are required." });

    const ids = accessions.split(",").map(a => a.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: "No valid accessions provided." });

    const query = ids.map(id => `accession:${id}`).join(" OR ");
    const uniprotFormat = format === "fasta" ? "fasta" : "txt";

    console.log(`[Protein] Download | format=${uniprotFormat} | ids=${ids.join(",")}`);

    const response = await axios.get("https://rest.uniprot.org/uniprotkb/search", {
      params: {
        query,
        format: uniprotFormat,
        size: ids.length,
      },
      timeout: 30000,
      headers: {
        Accept: "text/plain",
        "User-Agent": "ChemVault-ProteinSearch/1.0",
      },
      responseType: "text",
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(response.data);

  } catch (err) {
    console.error("[Protein] Download error:", err.message);
    res.status(500).json({ error: USER_ERRORS.download });
  }
});

// ====================== FULL PROTEIN DETAILS ======================
router.get("/:accession/all", async (req, res) => {
  try {
    const { accession } = req.params;
    if (!accession) {
      return res.status(400).json({ success: false, error: "Accession is required." });
    }

    console.log(`[Protein] Full details: ${accession}`);

    const results = await Promise.allSettled([
      getProteinOverview(accession),
      getProteinFunction(accession),
      getProteinSubcellular(accession),
      getProteinDisease(accession),
      getProteinPTM(accession),
      getProteinExpression(accession),
      getProteinInteraction(accession),
      getProteinDomains(accession),
      getProteinSequence(accession),
      getProteinStructure(accession),
      getProteinPublications(accession),
      getProteinCrossrefs(accession),
      getProteinSimilar(accession),
    ]);

    const payload = {
      overview:        results[0].status === "fulfilled" ? results[0].value : { error: "Failed to load overview." },
      function:        results[1].status === "fulfilled" ? results[1].value : { error: "Failed to load function data." },
      subcellular:     results[2].status === "fulfilled" ? results[2].value : null,
      disease:         results[3].status === "fulfilled" ? results[3].value : null,
      ptm:             results[4].status === "fulfilled" ? results[4].value : null,
      expression:      results[5].status === "fulfilled" ? results[5].value : null,
      interaction:     results[6].status === "fulfilled" ? results[6].value : null,
      domains:         results[7].status === "fulfilled" ? results[7].value : null,
      sequence:        results[8].status === "fulfilled" ? results[8].value : null,
      structure:       results[9].status === "fulfilled" ? results[9].value : null,
      publications:    results[10].status === "fulfilled" ? results[10].value : null,
      crossrefs:       results[11].status === "fulfilled" ? results[11].value : null,
      similarProteins: results[12].status === "fulfilled" ? results[12].value : null,
    };

    res.json({
      success: true,
      data: payload,
      accession,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[Protein] Full details failed for ${req.params.accession}:`, error.message);
    res.status(500).json({
      success: false,
      error: USER_ERRORS.details,
    });
  }
});

// ====================== INDIVIDUAL SECTION ROUTES ======================
router.get("/:accession/function", async (req, res) => {
  try {
    const data = await getProteinFunction(req.params.accession);
    res.json({ success: true, data });
  } catch (err) {
    console.error("[Protein] function section error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/overview", async (req, res) => {
  try {
    res.json(await getProteinOverview(req.params.accession));
  } catch (err) {
    console.error("[Protein] overview error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/subcellular", async (req, res) => {
  try {
    res.json(await getProteinSubcellular(req.params.accession));
  } catch (err) {
    console.error("[Protein] subcellular error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/disease", async (req, res) => {
  try {
    res.json(await getProteinDisease(req.params.accession));
  } catch (err) {
    console.error("[Protein] disease error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/ptm", async (req, res) => {
  try {
    res.json(await getProteinPTM(req.params.accession));
  } catch (err) {
    console.error("[Protein] ptm error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/expression", async (req, res) => {
  try {
    res.json(await getProteinExpression(req.params.accession));
  } catch (err) {
    console.error("[Protein] expression error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/interaction", async (req, res) => {
  try {
    res.json(await getProteinInteraction(req.params.accession));
  } catch (err) {
    console.error("[Protein] interaction error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/domains", async (req, res) => {
  try {
    res.json(await getProteinDomains(req.params.accession));
  } catch (err) {
    console.error("[Protein] domains error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/sequence", async (req, res) => {
  try {
    res.json(await getProteinSequence(req.params.accession));
  } catch (err) {
    console.error("[Protein] sequence error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/structure", async (req, res) => {
  try {
    res.json(await getProteinStructure(req.params.accession));
  } catch (err) {
    console.error("[Protein] structure error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/publications", async (req, res) => {
  try {
    res.json(await getProteinPublications(req.params.accession));
  } catch (err) {
    console.error("[Protein] publications error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/crossrefs", async (req, res) => {
  try {
    res.json(await getProteinCrossrefs(req.params.accession));
  } catch (err) {
    console.error("[Protein] crossrefs error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

router.get("/:accession/similar", async (req, res) => {
  try {
    res.json(await getProteinSimilar(req.params.accession));
  } catch (err) {
    console.error("[Protein] similar error:", err.message);
    res.status(500).json({ success: false, error: USER_ERRORS.section });
  }
});

module.exports = router;