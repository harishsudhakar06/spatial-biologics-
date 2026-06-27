// backend/services/proteinPTM.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches PTM and Processing features for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} PTM and processing data
 */
async function getProteinPTM(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinPTM",
      },
    });

    const data = response.data;
    const allFeatures = data.features || [];

    // Processing features (cleavage, maturation)
    const processingFeatures = allFeatures.filter(f => 
      ["SIGNAL", "PROPEPTIDE", "PEPTIDE", "CHAIN", "TRANSIT"].includes(f.type)
    );

    // Modifications (PTMs)
    const modificationFeatures = allFeatures.filter(f => 
      ["MOD_RES", "CARBOHYD", "DISULFID", "CROSSLNK", "LIPID", "PHOSPHORYLATION", "ACETYLATION"].includes(f.type)
    );

    const processing = processingFeatures.map(f => ({
      type: f.type,
      start: f.location?.start?.value || null,
      end: f.location?.end?.value || null,
      description: f.description || "",
      evidences: f.evidences?.map(ev => ev.evidenceCode) || []
    }));

    const modifications = modificationFeatures.map(f => ({
      type: f.type,
      position: f.location?.start?.value || null,
      description: f.description || "",
      evidences: f.evidences?.map(ev => ev.evidenceCode) || []
    }));

    return {
      processing,
      modifications,
      totalProcessing: processing.length,
      totalModifications: modifications.length,
      // Raw features for advanced use
      raw: {
        processing: processingFeatures,
        modifications: modificationFeatures
      }
    };

  } catch (error) {
    console.error(`Error fetching PTM data for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      processing: [],
      modifications: [],
      totalProcessing: 0,
      totalModifications: 0,
      raw: {},
      error: error.message
    };
  }
}

module.exports = { getProteinPTM };