// backend/services/proteinSequence.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches sequence and isoform information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Sequence and isoform data
 */
async function getProteinSequence(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinSequence",
      },
    });

    const data = response.data;

    // Main sequence
    const mainSequence = {
      raw: data.sequence?.value || "",
      length: data.sequence?.length || 0,
      molecularWeight: data.sequence?.molWeight || 0,
      crc64: data.sequence?.crc64 || "",
      md5: data.sequence?.md5 || "",
    };

    // Extract isoforms from ALTERNATIVE PRODUCTS comments
    const isoformComments = data.comments?.filter(c => 
      c.commentType === "ALTERNATIVE PRODUCTS" || c.type === "ALTERNATIVE PRODUCTS"
    ) || [];

    const isoforms = isoformComments.flatMap(comment => {
      return (comment.texts || []).map(text => ({
        name: text.value || "",
        description: comment.note?.texts?.[0]?.value || "",
        // Note: Actual isoform sequences are not always in the main entry
        // This is a placeholder; full isoform sequences may require separate calls
      }));
    });

    return {
      sequence: mainSequence.raw,
      length: mainSequence.length,
      molecularWeight: mainSequence.molecularWeight,
      crc64: mainSequence.crc64,
      md5: mainSequence.md5,
      
      isoforms: isoforms.length > 0 ? isoforms : [],
      
      // Full sequence object for convenience
      fullSequence: mainSequence,
      
      // Summary
      hasIsoforms: isoforms.length > 0
    };

  } catch (error) {
    console.error(`Error fetching sequence data for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      sequence: "",
      length: 0,
      molecularWeight: 0,
      crc64: "",
      md5: "",
      isoforms: [],
      fullSequence: {},
      hasIsoforms: false,
      error: error.message
    };
  }
}

module.exports = { getProteinSequence };