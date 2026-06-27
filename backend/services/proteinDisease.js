// backend/services/proteinDisease.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches disease and variant information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Disease and variant data
 */
async function getProteinDisease(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinDisease",
      },
    });

    const data = response.data;

    // Extract DISEASE comments
    const diseaseComments = data.comments?.filter(c => 
      c.commentType === "DISEASE" || c.type === "DISEASE"
    ) || [];

    // Extract VARIANT and MUTAGENESIS features
    const allFeatures = data.features || [];

    const variants = allFeatures.filter(f => f.type === "VARIANT");
    const mutagenesis = allFeatures.filter(f => f.type === "MUTAGENESIS");

    const diseases = diseaseComments.map(comment => ({
      name: comment.disease?.diseaseId || comment.texts?.[0]?.value?.split(".")[0] || "Unknown Disease",
      description: comment.texts?.[0]?.value || "",
      evidences: comment.evidences?.map(ev => ev.evidenceCode) || [],
      note: comment.note?.texts?.[0]?.value || null
    }));

    const processedVariants = variants.map(v => ({
      type: "VARIANT",
      position: v.location?.start?.value || null,
      original: v.original || "?",
      variant: v.variation || "?",
      description: v.description || "",
      evidences: v.evidences?.map(ev => ev.evidenceCode) || []
    }));

    const processedMutagenesis = mutagenesis.map(m => ({
      type: "MUTAGENESIS",
      position: m.location?.start?.value || null,
      original: m.original || "?",
      variant: m.variation || "?",
      description: m.description || "",
      evidences: m.evidences?.map(ev => ev.evidenceCode) || []
    }));

    return {
      diseases,
      variants: processedVariants,
      mutagenesis: processedMutagenesis,
      totalDiseases: diseases.length,
      totalVariants: processedVariants.length + processedMutagenesis.length
    };

  } catch (error) {
    console.error(`Error fetching disease/variant data for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      diseases: [],
      variants: [],
      mutagenesis: [],
      totalDiseases: 0,
      totalVariants: 0,
      error: error.message
    };
  }
}

module.exports = { getProteinDisease };