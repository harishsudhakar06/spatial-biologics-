// backend/services/proteinInteraction.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches interaction-related information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Interaction data
 */
async function getProteinInteraction(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinInteraction",
      },
    });

    const data = response.data;

    // Extract INTERACTION comments
    const interactionComments = data.comments?.filter(c => 
      c.commentType === "INTERACTION" || c.type === "INTERACTION"
    ) || [];

    // Extract cross-references for STRING and IntAct
    const crossReferences = data.uniProtKBCrossReferences || [];

    const stringLinks = crossReferences.filter(ref => 
      ref.database === "STRING"
    );

    const intactLinks = crossReferences.filter(ref => 
      ref.database === "IntAct"
    );

    // Process interaction comments
    const interactions = interactionComments.map(comment => ({
      text: comment.texts?.[0]?.value || "",
      evidences: comment.evidences?.map(ev => ev.evidenceCode || ev.source) || [],
      note: comment.note?.texts?.[0]?.value || null,
      interactors: comment.interactions || []
    }));

    return {
      interactions,
      stringLinks: stringLinks.map(link => ({
        id: link.id,
        database: link.database,
        properties: link.properties || {}
      })),
      intactLinks: intactLinks.map(link => ({
        id: link.id,
        database: link.database,
        properties: link.properties || {}
      })),
      
      // Summary
      totalInteractions: interactions.length,
      hasStringData: stringLinks.length > 0,
      hasIntActData: intactLinks.length > 0,
      
      // Raw data for advanced usage
      raw: {
        interactionComments,
        stringLinks,
        intactLinks
      }
    };

  } catch (error) {
    console.error(`Error fetching interaction data for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      interactions: [],
      stringLinks: [],
      intactLinks: [],
      totalInteractions: 0,
      hasStringData: false,
      hasIntActData: false,
      raw: {},
      error: error.message
    };
  }
}

module.exports = { getProteinInteraction };