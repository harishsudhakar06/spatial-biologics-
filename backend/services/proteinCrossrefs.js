// backend/services/proteinCrossrefs.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

/**
 * Fetches cross-references for a protein from UniProt
 * @param {string} accession - UniProt accession (e.g., P01308)
 * @returns {Promise<Object>} Grouped cross-references
 */
async function getProteinCrossrefs(accession) {
  try {
    if (!accession) {
      throw new Error("Accession is required");
    }

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinCrossrefs",
      },
    });

    const data = response.data;
    const crossRefs = data.uniProtKBCrossReferences || [];

    // Group cross-references by database
    const pdb = crossRefs.filter(ref => ref.database === "PDB");
    const pfam = crossRefs.filter(ref => ref.database === "Pfam");
    const interpro = crossRefs.filter(ref => ref.database === "InterPro");
    const reactome = crossRefs.filter(ref => ref.database === "Reactome");
    const ensembl = crossRefs.filter(ref => ref.database === "Ensembl");
    const omim = crossRefs.filter(ref => ref.database === "MIM" || ref.database === "OMIM");
    const kegg = crossRefs.filter(ref => ref.database === "KEGG");

    return {
      pdb: pdb.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      pfam: pfam.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      interpro: interpro.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      reactome: reactome.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      ensembl: ensembl.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      omim: omim.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      kegg: kegg.map(ref => ({
        id: ref.id,
        database: ref.database,
        properties: ref.properties || {}
      })),

      // Summary counts
      totalCrossRefs: crossRefs.length,
      counts: {
        pdb: pdb.length,
        pfam: pfam.length,
        interpro: interpro.length,
        reactome: reactome.length,
        ensembl: ensembl.length,
        omim: omim.length,
        kegg: kegg.length
      }
    };

  } catch (error) {
    console.error(`Error fetching cross-references for ${accession}:`, error.message);
    
    // Graceful fallback
    return {
      pdb: [],
      pfam: [],
      interpro: [],
      reactome: [],
      ensembl: [],
      omim: [],
      kegg: [],
      totalCrossRefs: 0,
      counts: {
        pdb: 0, pfam: 0, interpro: 0, reactome: 0, 
        ensembl: 0, omim: 0, kegg: 0
      },
      error: error.message
    };
  }
}

module.exports = { getProteinCrossrefs };