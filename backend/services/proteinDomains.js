// backend/services/proteinDomains.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches domain and feature information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Domains and related features
 */
async function getProteinDomains(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinDomains",
      },
    });

    const data = response.data;
    const allFeatures = data.features || [];

    // Categorize features
    const domains = allFeatures.filter(f => 
      ["DOMAIN", "ZN_FING", "COILED"].includes(f.type)
    );

    const regions = allFeatures.filter(f => 
      ["REGION", "REPEAT"].includes(f.type)
    );

    const motifs = allFeatures.filter(f => f.type === "MOTIF");

    const activeSites = allFeatures.filter(f => f.type === "ACTIVE_SITE");

    const bindingSites = allFeatures.filter(f => 
      ["BINDING", "SITE"].includes(f.type)
    );

    // Unified Feature Track for graphical viewer
    const featureTrack = allFeatures
      .filter(f => 
        ["DOMAIN", "REGION", "REPEAT", "MOTIF", "ZN_FING", "COILED", 
         "ACTIVE_SITE", "BINDING", "SITE"].includes(f.type)
      )
      .map(f => ({
        type: f.type,
        start: f.location?.start?.value || null,
        end: f.location?.end?.value || null,
        description: f.description || "",
        category: getFeatureCategory(f.type)
      }));

    function getFeatureCategory(type) {
      if (["DOMAIN", "ZN_FING", "COILED"].includes(type)) return "domain";
      if (["REGION", "REPEAT"].includes(type)) return "region";
      if (type === "MOTIF") return "motif";
      if (type === "ACTIVE_SITE") return "active";
      if (["BINDING", "SITE"].includes(type)) return "binding";
      return "other";
    }

    return {
      domains: domains.map(f => ({
        type: f.type,
        start: f.location?.start?.value,
        end: f.location?.end?.value,
        description: f.description || ""
      })),

      regions: regions.map(f => ({
        type: f.type,
        start: f.location?.start?.value,
        end: f.location?.end?.value,
        description: f.description || ""
      })),

      motifs: motifs.map(f => ({
        type: f.type,
        start: f.location?.start?.value,
        end: f.location?.end?.value,
        description: f.description || ""
      })),

      activeSites: activeSites.map(f => ({
        type: f.type,
        position: f.location?.start?.value,
        description: f.description || ""
      })),

      bindingSites: bindingSites.map(f => ({
        type: f.type,
        position: f.location?.start?.value,
        description: f.description || ""
      })),

      featureTrack,

      // Summary
      totalDomains: domains.length,
      totalRegions: regions.length,
      totalMotifs: motifs.length,
      totalActiveSites: activeSites.length,
      totalBindingSites: bindingSites.length
    };

  } catch (error) {
    console.error(`Error fetching domains for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      domains: [],
      regions: [],
      motifs: [],
      activeSites: [],
      bindingSites: [],
      featureTrack: [],
      totalDomains: 0,
      totalRegions: 0,
      totalMotifs: 0,
      totalActiveSites: 0,
      totalBindingSites: 0,
      error: error.message
    };
  }
}

module.exports = { getProteinDomains };