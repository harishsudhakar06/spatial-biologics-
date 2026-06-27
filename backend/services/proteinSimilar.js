// backend/services/proteinSimilar.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches similar proteins from UniRef clusters (100%, 90%, 50%)
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Similar proteins grouped by identity level
 */
async function getProteinSimilar(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const [uniref100, uniref90, uniref50] = await Promise.allSettled([
      fetchUniRef(`UniRef100_${accession}`),
      fetchUniRef(`UniRef90_${accession}`),
      fetchUniRef(`UniRef50_${accession}`)
    ]);

    const processMembers = (result) => {
      if (result.status === 'fulfilled' && result.value?.members) {
        return result.value.members.map(member => ({
          accession: member.accession || member.id,
          proteinName: member.proteinName || "Unknown Protein",
          organism: member.organismName || member.organism?.scientificName || "Unknown Organism",
          length: member.sequenceLength || null,
          identity: member.identity || null
        }));
      }
      return [];
    };

    return {
      uniref100: processMembers(uniref100),
      uniref90: processMembers(uniref90),
      uniref50: processMembers(uniref50),

      // Summary
      totalUniref100: processMembers(uniref100).length,
      totalUniref90: processMembers(uniref90).length,
      totalUniref50: processMembers(uniref50).length
    };

  } catch (error) {
    console.error(`Error fetching similar proteins for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      uniref100: [],
      uniref90: [],
      uniref50: [],
      totalUniref100: 0,
      totalUniref90: 0,
      totalUniref50: 0,
      error: error.message
    };
  }
}

/**
 * Helper function to fetch UniRef cluster
 */
async function fetchUniRef(clusterId) {
  try {
    const response = await axios.get(`${UNIPROT_BASE}/uniref/${clusterId}.json`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.warn(`UniRef fetch failed for ${clusterId}:`, error.message);
    return null;
  }
}

module.exports = { getProteinSimilar };