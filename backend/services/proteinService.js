// backend/services/proteinService.js
const axios = require('axios');

const UNIPROT_BASE = 'https://rest.uniprot.org';

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url, { timeout: 12000 });
      return res.data;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 800 * (i + 1)));
    }
  }
}

function getComments(data, type) {
  if (!data?.comments) return [];
  return data.comments.filter(c => 
    c.commentType === type || c.type === type
  );
}

async function getProteinDetails(accession) {
  try {
    // Main UniProt Data
    const uniData = await fetchWithRetry(`${UNIPROT_BASE}/uniprotkb/${accession}.json`);

    // UniRef100
    let uniref = null;
    try {
      uniref = await fetchWithRetry(`${UNIPROT_BASE}/uniref/UniRef100_${accession}.json`);
    } catch (e) {}

    // Processed Data
    const protein = {
      accession: uniData.primaryAccession,
      entryName: uniData.uniProtkbId,
      proteinName: uniData.proteinDescription?.recommendedName?.fullName?.value || "Unknown Protein",
      alternativeNames: uniData.proteinDescription?.alternativeNames?.map(n => n.fullName?.value) || [],
      geneName: uniData.genes?.[0]?.geneName?.value || "",
      organism: uniData.organism?.scientificName || "",
      taxonomy: uniData.organism?.lineage || [],
      keywords: uniData.keywords?.map(k => k.name) || [],
      proteomes: uniData.proteomes || [],
      annotationScore: uniData.annotationScore || null,
      proteinExistence: uniData.proteinExistence?.description || "Unknown",
    };

    const sequence = {
      raw: uniData.sequence?.value || "",
      length: uniData.sequence?.length || 0,
      molecularWeight: uniData.sequence?.molWeight || 0,
      crc64: uniData.sequence?.crc64 || "",
      isoforms: uniData.comments?.filter(c => c.commentType === "ALTERNATIVE PRODUCTS") || [],
    };

    const functionData = getComments(uniData, "FUNCTION");
    const catalyticActivity = getComments(uniData, "CATALYTIC ACTIVITY");
    const pathway = getComments(uniData, "PATHWAY");

    const subcellularLocation = getComments(uniData, "SUBCELLULAR LOCATION");
    const disease = getComments(uniData, "DISEASE");
    const similarity = getComments(uniData, "SIMILARITY");
    const interaction = getComments(uniData, "INTERACTION");
    const expression = getComments(uniData, "TISSUE SPECIFICITY")
      .concat(getComments(uniData, "DEVELOPMENTAL STAGE"))
      .concat(getComments(uniData, "INDUCTION"));

    // Features
    const allFeatures = uniData.features || [];

    const ptmFeatures = allFeatures.filter(f => 
      ["SIGNAL", "PROPEPTIDE", "CHAIN", "PEPTIDE", "MOD_RES", "CARBOHYD", "DISULFID", "CROSSLNK"].includes(f.type)
    );

    const domainFeatures = allFeatures.filter(f => 
      ["DOMAIN", "REGION", "REPEAT", "MOTIF", "ZN_FING", "COILED"].includes(f.type)
    );

    const variants = allFeatures.filter(f => 
      ["VARIANT", "MUTAGENESIS"].includes(f.type)
    );

    // Feature Track for graphical viewer
    const featureTrack = allFeatures.map(f => ({
      type: f.type,
      start: f.location?.start?.value,
      end: f.location?.end?.value,
      description: f.description,
      category: ["SIGNAL", "PROPEPTIDE"].includes(f.type) ? "processing" :
                 ["DOMAIN", "REGION"].includes(f.type) ? "domain" :
                 ["VARIANT", "MUTAGENESIS"].includes(f.type) ? "variant" : "other"
    }));

    // Structure
    const structure = {
      pdb: uniData.uniProtKBCrossReferences?.filter(ref => ref.database === "PDB") || [],
      alphaFold: uniData.uniProtKBCrossReferences?.find(ref => ref.database === "AlphaFoldDB") || null,
    };

    const publications = uniData.references?.map(ref => ({
      pmid: ref.citation?.pubmedId,
      title: ref.citation?.title,
      authors: ref.citation?.authors?.map(a => a.name).join(", ") || "",
      journal: ref.citation?.journal,
      year: ref.citation?.publicationDate?.split("-")[0],
    })) || [];

    const crossReferences = {
      pdb: uniData.uniProtKBCrossReferences?.filter(r => r.database === "PDB") || [],
      pfam: uniData.uniProtKBCrossReferences?.filter(r => r.database === "Pfam") || [],
      interpro: uniData.uniProtKBCrossReferences?.filter(r => r.database === "InterPro") || [],
      reactome: uniData.uniProtKBCrossReferences?.filter(r => r.database === "Reactome") || [],
      ensembl: uniData.uniProtKBCrossReferences?.filter(r => r.database === "Ensembl") || [],
      omim: uniData.uniProtKBCrossReferences?.filter(r => r.database === "MIM") || [],
    };

    return {
      accession: protein.accession,
      entryName: protein.entryName,
      protein,
      sequence,
      function: functionData.concat(catalyticActivity),
      pathway,
      subcellularLocation,
      disease,
      similarity,
      interaction,
      expression,
      ptm: ptmFeatures,
      domains: domainFeatures,
      variants,
      featureTrack,
      structure,
      similarProteins: uniref?.members?.slice(0, 12) || [],
      publications,
      crossReferences,
      keywords: protein.keywords,
      proteomes: protein.proteomes,
    };

  } catch (error) {
    console.error(`Error fetching ${accession}:`, error.message);
    throw new Error(`Failed to aggregate protein data for ${accession}`);
  }
}

module.exports = { getProteinDetails };