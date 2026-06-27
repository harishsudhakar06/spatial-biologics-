// backend/services/proteinStructure.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches structure-related information for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Structure data
 */
async function getProteinStructure(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinStructure",
      },
    });

    const data = response.data;

    // Extract PDB entries from cross-references
    const pdbEntries = (data.uniProtKBCrossReferences || [])
      .filter(ref => ref.database === "PDB")
      .map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {},
        // Additional metadata can be added later via RCSB API if needed
      }));

    // Extract AlphaFoldDB reference
    const alphaFoldRef = (data.uniProtKBCrossReferences || [])
      .find(ref => ref.database === "AlphaFoldDB");

    const alphaFold = alphaFoldRef ? {
      id: alphaFoldRef.id,
      database: alphaFoldRef.database,
      properties: alphaFoldRef.properties || {},
      modelUrl: `https://alphafold.ebi.ac.uk/entry/${accession}`,
      available: true
    } : { available: false };

    // Basic structure coverage (can be enhanced later)
    const structureCoverage = [
      {
        type: "UniProt Sequence",
        covered: data.sequence?.length || 0,
        total: data.sequence?.length || 0,
        percentage: 100
      }
    ];

    // Add PDB coverage if available
    if (pdbEntries.length > 0) {
      structureCoverage.push({
        type: "PDB Structures",
        count: pdbEntries.length,
        covered: "Partial",
        total: data.sequence?.length || 0
      });
    }

    return {
      pdbEntries,
      alphaFold,
      structureCoverage,
      
      // Summary
      totalPDB: pdbEntries.length,
      hasAlphaFold: alphaFold.available,
      
      // Raw cross references for advanced use
      raw: {
        pdbEntries: pdbEntries,
        alphaFoldRef: alphaFoldRef
      }
    };

  } catch (error) {
    console.error(`Error fetching structure data for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      pdbEntries: [],
      alphaFold: { available: false },
      structureCoverage: [],
      totalPDB: 0,
      hasAlphaFold: false,
      raw: {},
      error: error.message
    };
  }
}

module.exports = { getProteinStructure };