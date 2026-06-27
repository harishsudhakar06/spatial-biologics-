// backend/services/proteinExpression.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches expression-related information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Expression data
 */
async function getProteinExpression(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinExpression",
      },
    });

    const data = response.data;

    // Helper to extract comments by type
    const getComments = (type) => {
      if (!data.comments) return [];
      return data.comments.filter(c => 
        c.commentType === type || c.type === type
      );
    };

    const tissueSpecificity = getComments("TISSUE SPECIFICITY");
    const developmentalStage = getComments("DEVELOPMENTAL STAGE");
    const induction = getComments("INDUCTION");

    const processComments = (comments) => {
      return comments.map(comment => ({
        text: comment.texts?.[0]?.value || "",
        evidences: comment.evidences?.map(ev => ev.evidenceCode || ev.source) || [],
        note: comment.note?.texts?.[0]?.value || null
      }));
    };

    return {
      tissueSpecificity: processComments(tissueSpecificity),
      developmentalStage: processComments(developmentalStage),
      induction: processComments(induction),
      
      // Summary counts
      hasTissueSpecificity: tissueSpecificity.length > 0,
      hasDevelopmentalStage: developmentalStage.length > 0,
      hasInduction: induction.length > 0,
      
      // Raw data for advanced usage
      raw: {
        tissueSpecificity,
        developmentalStage,
        induction
      }
    };

  } catch (error) {
    console.error(`Error fetching expression data for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      tissueSpecificity: [],
      developmentalStage: [],
      induction: [],
      hasTissueSpecificity: false,
      hasDevelopmentalStage: false,
      hasInduction: false,
      raw: {},
      error: error.message
    };
  }
}

module.exports = { getProteinExpression };