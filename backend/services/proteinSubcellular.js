// backend/services/proteinSubcellular.js
const axios = require('axios');
const UNIPROT_BASE = 'https://rest.uniprot.org';

async function getProteinSubcellular(accession) {
  try {
    if (!accession) throw new Error("Accession is required");

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: { Accept: "application/json", "User-Agent": "ChemVault-ProteinSubcellular" },
    });

    const data = response.data;

    const subcellularComments = data.comments?.filter(c =>
      c.commentType === "SUBCELLULAR LOCATION" || c.type === "SUBCELLULAR LOCATION"
    ) || [];

    const locations = [];
    const swissIds = new Set();

    for (const comment of subcellularComments) {
      // Extract SwissBioPics IDs from subcellularLocations array
      if (Array.isArray(comment.subcellularLocations)) {
        for (const sl of comment.subcellularLocations) {
          const locVal = sl.location?.value || "";
          const locId  = sl.location?.id    || "";
          if (locId) swissIds.add(locId);

          locations.push({
            location:  locVal,
            locationId: locId,
            topology:  sl.topology?.value   || null,
            orientation: sl.orientation?.value || null,
            evidence:  (sl.location?.evidences || []).map(ev => ev.evidenceCode || ev.source?.name || ""),
            note:      comment.note?.texts?.[0]?.value || null,
          });
        }
      } else {
        // Fallback: old text-only shape
        for (const textObj of (comment.texts || [])) {
          locations.push({
            location:  textObj.value || "",
            locationId: null,
            topology:  null,
            orientation: null,
            evidence:  (comment.evidences || []).map(ev => ev.evidenceCode || ev.source?.name || ""),
            note:      comment.note?.texts?.[0]?.value || null,
          });
        }
      }
    }

    return {
      locations,
      swissIds: Array.from(swissIds), // e.g. ["SL-0086", "SL-0191"]
    };

  } catch (error) {
    console.error(`Error fetching subcellular location for ${accession}:`, error.message);
    return { locations: [], swissIds: [], error: error.message };
  }
}

module.exports = { getProteinSubcellular };