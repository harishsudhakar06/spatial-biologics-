const axios = require('axios');

const SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query";
const GRAPHQL_URL = "https://data.rcsb.org/graphql";

const SEARCH_GQL = `
query GetEntries($ids: [String!]!) {
  entries(entry_ids: $ids) {
    rcsb_id
    struct { title }
    rcsb_accession_info { initial_release_date deposit_date }
    exptl { method }
    audit_author { name }
    struct_keywords { pdbx_keywords }
    rcsb_entry_info { resolution_combined }
    polymer_entities {
      rcsb_polymer_entity {
        pdbx_description
        rcsb_macromolecular_names_combined { name }
      }
      rcsb_entity_source_organism { ncbi_scientific_name }
    }
  }
}
`;

async function gqlPost(query, variables) {
  const res = await axios.post(GRAPHQL_URL, { query, variables }, { timeout: 20000 });
  return res.data;
}

function safeDict(v) { return (v && typeof v === "object" && !Array.isArray(v)) ? v : {}; }
function safeList(v) { return Array.isArray(v) ? v : []; }

async function runSearch() {
  const keyword = "hemoglobin";
  const start = 0;
  const rows = 10;
  const includeCSM = false;

  const searchQueryPayload = {
    query: { type: "terminal", service: "full_text", parameters: { value: keyword } },
    return_type: "entry",
    request_options: {
      paginate: { start, rows },
      results_content_type: ["experimental"],
      sort: [{ sort_by: "score", direction: "desc" }]
    }
  };

  try {
    const searchRes = await axios.post(SEARCH_URL, searchQueryPayload, { timeout: 15000 });
    const searchData = searchRes.data || {};
    const resultSet = searchData.result_set || [];
    console.log("Search Result Count:", resultSet.length);
    if (resultSet.length === 0) return;

    const ids = resultSet.map(item => item.identifier.split(":")[0].toUpperCase());
    console.log("Searching details for IDs:", ids);

    const gqlRes = await gqlPost(SEARCH_GQL, { ids });
    console.log("GQL Errors if any:", gqlRes.errors);
    const entries = safeList(gqlRes.data?.entries);
    console.log("GQL Entries returned count:", entries.length);

    const graphqlData = {};
    for (const entry of entries) {
      if (entry && entry.rcsb_id) {
        graphqlData[entry.rcsb_id.toUpperCase()] = entry;
      }
    }

    for (const item of resultSet) {
      const pid = item.identifier.split(":")[0].toUpperCase();
      const meta = graphqlData[pid] || {};
      const title = safeDict(meta.struct).title || "N/A";
      const acc = safeDict(meta.rcsb_accession_info);
      const release_date = (acc.initial_release_date || "").split("T")[0] || "N/A";
      console.log(`ID: ${pid} | Title: ${title} | Released: ${release_date}`);
    }

  } catch (err) {
    console.error("ERROR running search test:", err);
  }
}

runSearch();
