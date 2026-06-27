const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const BASE_URL = "https://rest.uniprot.org/uniprotkb";

async function searchProteins({ query, status, organism, offset = 0, limit = 5 }) {
  let searchQuery = query || "*";
  const filters = [];

  if (status === "reviewed") filters.push("reviewed:true");
  if (status === "unreviewed") filters.push("reviewed:false");

  if (organism && organism !== "all") {
    const orgMap = {
      human: "organism_id:9606",
      mouse: "organism_id:10090",
      rat: "organism_id:10116",
      bacteria: "taxonomy_id:2",
      plants: "taxonomy_id:33090",
      yeast: "organism_id:559292",
      zebrafish: "organism_id:7955",
    };
    if (orgMap[organism]) filters.push(orgMap[organism]);
  }

  if (filters.length > 0) {
    searchQuery = `(${searchQuery}) AND (${filters.join(" AND ")})`;
  }

  const response = await axios.get(`${BASE_URL}/search`, {
    params: {
      query: searchQuery,
      fields: "accession,id,protein_name,gene_names,organism_name,length,reviewed",
      format: "json",
      size: limit,
      offset: offset,
    },
    httpsAgent,
    timeout: 15000,
  });

  const results = (response.data.results || []).map(entry => ({
    accession: entry.primaryAccession,
    entryName: entry.uniProtkbId,
    proteinName:
      entry.proteinDescription?.recommendedName?.fullName?.value ||
      entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ||
      "N/A",
    gene: entry.genes?.[0]?.geneName?.value || "N/A",
    organism: entry.organism?.scientificName || "N/A",
    length: entry.sequence?.length || "N/A",
    status: entry.entryType?.includes("Swiss-Prot") ? "Reviewed" : "Unreviewed",
  }));

  const total = parseInt(response.headers["x-total-results"] || "0");
  return { results, total, offset, limit };
}

async function getProteinById(id) {
  const response = await axios.get(`${BASE_URL}/${id}`, {
    params: { format: "json" },
    httpsAgent,
    timeout: 15000,
  });
  return response.data;
}

module.exports = { searchProteins, getProteinById };