// backend/services/proteinOverview.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches basic overview information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Protein overview data
 */
async function getProteinOverview(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinOverview",
      },
    });

    const data = response.data;

    // Extract and clean overview data
    const overview = {
      accession: data.primaryAccession || accession,
      entryName: data.uniProtkbId || "—",
      
      proteinName: data.proteinDescription?.recommendedName?.fullName?.value || 
                  data.proteinDescription?.recommendedName?.shortName?.value || 
                  "Unnamed Protein",

      alternativeNames: data.proteinDescription?.alternativeNames?.map(n => 
        n.fullName?.value || n.shortName?.value
      ).filter(Boolean) || [],

      geneName: data.genes?.[0]?.geneName?.value || 
               data.genes?.[0]?.synonyms?.[0]?.value || "—",

      organism: data.organism?.scientificName || "—",
      taxonomy: data.organism?.lineage || [],

      annotationScore: data.annotationScore || null,
      proteinExistence: data.proteinExistence?.description || "Unknown",

      keywords: data.keywords?.map(k => k.name).filter(Boolean) || [],
      
      proteomes: data.proteomes?.map(p => ({
        name: p.component,
        proteomeId: p.proteomeId
      })) || [],

      reviewedStatus: data.entryType?.includes("Swiss-Prot") ? "Reviewed" : "Unreviewed",

      // Additional useful fields
      length: data.sequence?.length || 0,
      molecularWeight: data.sequence?.molWeight || 0,
    };

    return overview;

  } catch (error) {
    console.error(`Error fetching overview for ${accession}:`, error.message);
    
    // Return graceful fallback
    return {
      accession: accession,
      entryName: "—",
      proteinName: "Error loading protein",
      alternativeNames: [],
      geneName: "—",
      organism: "—",
      taxonomy: [],
      annotationScore: null,
      proteinExistence: "Unknown",
      keywords: [],
      proteomes: [],
      reviewedStatus: "Error",
      length: 0,
      molecularWeight: 0,
      error: error.message
    };
  }
}

module.exports = { getProteinOverview };