// backend/services/proteinFunction.js
const axios = require('axios');
const UNIPROT_BASE = 'https://rest.uniprot.org';

const isValidAccession = (acc) => /^[A-NR-Z][0-9][A-Z][A-Z0-9]{1,}$/i.test(acc);

const extractText = (item) => item?.texts?.[0]?.value || item?.text || "";
const extractEvidences = (item) => item?.evidences || [];

async function getProteinFunction(accession) {
  try {
    if (!accession) throw new Error("Accession is required");
    if (!isValidAccession(accession)) throw new Error("Invalid UniProt accession");

    const response = await axios.get(`${UNIPROT_BASE}/uniprotkb/${accession}.json`, {
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "User-Agent": "ChemVault-ProteinFunction/1.0",
      },
    });

    const data = response.data;

    const getComments = (type) => 
      (data.comments || []).filter(c => 
        c.commentType === type || 
        c.type === type
      );

    const goReferences = data.uniProtKBCrossReferences?.filter(ref => ref.database === "GO") || [];

    const goAnnotations = { molecularFunction: [], biologicalProcess: [], cellularComponent: [] };

    goReferences.forEach(ref => {
      const goTerm = ref.properties?.find(p => p.key === "GoTerm")?.value;
      if (!goTerm) return;

      const term = goTerm.replace(/^[FPC]:/, "").trim();
      const entry = { id: ref.id, term };

      if (goTerm.startsWith("F:")) goAnnotations.molecularFunction.push(entry);
      else if (goTerm.startsWith("P:")) goAnnotations.biologicalProcess.push(entry);
      else if (goTerm.startsWith("C:")) goAnnotations.cellularComponent.push(entry);
    });

    return {
      function: getComments("FUNCTION").map(item => ({
        text: extractText(item),
        evidences: extractEvidences(item)
      })),
      catalyticActivity: getComments("CATALYTIC ACTIVITY").map(item => ({
        text: extractText(item),
        evidences: extractEvidences(item)
      })),
      pathways: getComments("PATHWAY").map(item => ({
        text: extractText(item),
        evidences: extractEvidences(item)
      })),
      regulation: getComments("ACTIVITY REGULATION").map(item => ({
        text: extractText(item),
        evidences: extractEvidences(item)
      })),

      goAnnotations,
      
      reactome: data.uniProtKBCrossReferences
        ?.filter(ref => ref.database === "Reactome")
        ?.map(ref => ({
          id: ref.id,
          name: ref.properties?.find(p => p.key === "PathwayName")?.value || "",
          properties: ref.properties || []
        })) || [],

      kegg: data.uniProtKBCrossReferences
        ?.filter(ref => ref.database === "KEGG")
        ?.map(ref => ({
          id: ref.id,
          name: ref.properties?.find(p => p.key === "PathwayName")?.value || "",
          properties: ref.properties || []
        })) || [],

      raw: data // Optional: full data for advanced use
    };

  } catch (error) {
    console.error(`Error fetching function data for ${accession}:`, error.message);
    
    return {
      function: [],
      catalyticActivity: [],
      pathways: [],
      regulation: [],
      goAnnotations: { molecularFunction: [], biologicalProcess: [], cellularComponent: [] },
      reactome: [],
      kegg: [],
      error: error.message,
      raw: null
    };
  }
}

module.exports = { getProteinFunction };