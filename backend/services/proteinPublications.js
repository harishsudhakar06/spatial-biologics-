// backend/services/proteinPublications.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches publication references for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Array>} Array of publication objects
 */
async function getProteinPublications(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinPublications",
      },
    });

    const data = response.data;

    // Extract references
    const references = data.references || [];

    const publications = references.map((ref, index) => {
      const citation = ref.citation || {};
      
      return {
        pmid: citation.pubmedId || null,
        title: citation.title || "Untitled Publication",
        authors: citation.authors 
          ? citation.authors.map(author => author.name).join(", ")
          : "Unknown Authors",
        journal: citation.journal || "Unknown Journal",
        year: citation.publicationDate 
          ? citation.publicationDate.split("-")[0] 
          : null,
        volume: citation.volume || null,
        firstPage: citation.firstPage || null,
        lastPage: citation.lastPage || null,
        // Additional context from UniProt
        referenceNumber: ref.citation?.referenceNumber || index + 1,
        evidences: ref.evidences || []
      };
    });

    // Sort by year (newest first) if available
    publications.sort((a, b) => {
      if (b.year && a.year) return parseInt(b.year) - parseInt(a.year);
      return 0;
    });

    return publications;

  } catch (error) {
    console.error(`Error fetching publications for ${accession}:`, error.message);
    
    // Graceful fallback
    return [{
      pmid: null,
      title: "Unable to load publications",
      authors: "",
      journal: "",
      year: null,
      error: error.message
    }];
  }
}

module.exports = { getProteinPublications };