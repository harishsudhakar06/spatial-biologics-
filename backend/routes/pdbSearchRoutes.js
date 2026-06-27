const express = require("express");
const router = express.Router();
const axios = require("axios");

// In-memory caches (restarting server clears these)
const CHEM_COMP_CACHE = {};
const STRUCTURE_CACHE = {};
const SEARCH_CACHE = {};

const SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query";
const ENTRY_URL = "https://data.rcsb.org/rest/v1/core/entry";
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

const DETAIL_GQL = `
query($id: String!) {
  entry(entry_id: $id) {
    rcsb_id
    struct { title }
    rcsb_accession_info { deposit_date initial_release_date }
    exptl { method }
    audit_author { name }
    struct_keywords { pdbx_keywords }
    refine {
      ls_R_factor_R_free
      ls_R_factor_R_work
      ls_R_factor_obs
      pdbx_starting_model
    }
    rcsb_entry_info {
      molecular_weight
      deposited_atom_count
      deposited_modeled_polymer_monomer_count
      deposited_polymer_monomer_count
      polymer_entity_count_protein
      polymer_entity_count
      deposited_model_count
      resolution_combined
    }
    pdbx_vrpt_summary {
      attempted_validation_steps
      report_creation_date
    }
    pdbx_vrpt_summary_geometry {
      clashscore
      percent_ramachandran_outliers
      percent_rotamer_outliers
    }
    pdbx_vrpt_summary_diffraction {
      DCC_Rfree
      DCC_R
      percent_RSRZ_outliers
    }
    assemblies {
      rcsb_id
      rcsb_struct_symmetry {
        kind
        symbol
        type
        oligomeric_state
        stoichiometry
      }
    }
    nonpolymer_entities {
      nonpolymer_comp {
        chem_comp { id name type formula }
      }
      rcsb_nonpolymer_entity_container_identifiers { asym_ids auth_asym_ids }
      nonpolymer_entity_instances {
        rcsb_id
        rcsb_nonpolymer_instance_validation_score {
          RSCC
          RSR
        }
      }
    }
    polymer_entities {
      entity_id: rcsb_polymer_entity_container_identifiers {
        entity_id
        auth_asym_ids
        chem_comp_nstd_monomers
      }
      rcsb_polymer_entity {
        pdbx_description
        pdbx_mutation
        formula_weight
        rcsb_macromolecular_names_combined { name }
      }
      rcsb_entity_source_organism { ncbi_scientific_name ncbi_taxonomy_id }
      entity_src_gen { pdbx_host_org_scientific_name }
      uniprots { rcsb_id }
      entity_poly {
        type
        rcsb_sample_sequence_length
        pdbx_seq_one_letter_code_can
      }
      rcsb_polymer_entity_feature {
        name
        type
        feature_positions {
          beg_seq_id
        }
        additional_properties {
          name
          values
        }
      }
    }
  }
}
`;

// Helper: fetch single chem comp
async function fetchSingleChemComp(cid) {
  const cidUpper = cid.toUpperCase();
  if (CHEM_COMP_CACHE[cidUpper]) {
    return CHEM_COMP_CACHE[cidUpper];
  }
  try {
    const r = await axios.get(`https://data.rcsb.org/rest/v1/core/chemcomp/${cidUpper}`, { timeout: 5000 });
    if (r.status === 200 && r.data) {
      const d = r.data;
      const cc = d.chem_comp || {};
      const desc = d.rcsb_chem_comp_descriptor || {};
      const val = [
        cc.name || "",
        cc.type || "NON-POLYMER",
        cc.formula || "",
        desc.SMILES || desc.smiles || ""
      ];
      CHEM_COMP_CACHE[cidUpper] = val;
      return val;
    }
  } catch (err) {
    // ignore
  }
  const val = ["", "NON-POLYMER", "", ""];
  CHEM_COMP_CACHE[cidUpper] = val;
  return val;
}

// Helper: GQL POST
async function gqlPost(query, variables) {
  const res = await axios.post(GRAPHQL_URL, { query, variables }, { timeout: 20000 });
  return res.data;
}

// Helpers for safe arrays/objects
function safeDict(v) { return (v && typeof v === "object" && !Array.isArray(v)) ? v : {}; }
function safeList(v) { return Array.isArray(v) ? v : []; }
function fmtNum(v, decimals = 3) {
  if (v === null || v === undefined) return null;
  const num = parseFloat(v);
  return isNaN(num) ? null : parseFloat(num.toFixed(decimals));
}

// Facets config mapping
const FACETS = [
  { name: "methodology", aggregation_type: "terms", attribute: "rcsb_entry_info.structure_determination_methodology" },
  { name: "organism", aggregation_type: "terms", attribute: "rcsb_entity_source_organism.scientific_name", min_interval_population: 1 },
  { name: "taxonomy", aggregation_type: "terms", attribute: "rcsb_entity_source_organism.taxonomy_lineage.name", min_interval_population: 1 },
  { name: "experimental_method", aggregation_type: "terms", attribute: "exptl.method" },
  { name: "integrative_input", aggregation_type: "terms", attribute: "rcsb_entry_info.selected_polymer_entity_types" },
  { name: "polymer_entity_type", aggregation_type: "terms", attribute: "entity_poly.rcsb_entity_polymer_type" },
  {
    name: "resolution",
    aggregation_type: "range",
    attribute: "rcsb_entry_info.resolution_combined",
    ranges: [
      { from: 0.5, to: 1.0 }, { from: 1.0, to: 1.5 },
      { from: 1.5, to: 2.0 }, { from: 2.0, to: 2.5 },
      { from: 2.5, to: 3.0 }, { from: 3.0, to: 3.5 },
      { from: 3.5, to: 4.0 }, { from: 4.0, to: 4.5 },
      { from: 4.5, to: 9999 }
    ]
  },
  { name: "release_date", aggregation_type: "date_histogram", attribute: "rcsb_accession_info.initial_release_date", interval: "year" },
  { name: "enzyme_class", aggregation_type: "terms", attribute: "rcsb_polymer_entity.rcsb_ec_lineage.name", min_interval_population: 1 },
  { name: "membrane_protein", aggregation_type: "terms", attribute: "rcsb_polymer_entity_annotation.type", min_interval_population: 1 },
  { name: "symmetry_type", aggregation_type: "terms", attribute: "rcsb_struct_symmetry.type" },
  { name: "scop_class", aggregation_type: "terms", attribute: "rcsb_polymer_instance_annotation.annotation_lineage.name", min_interval_population: 1 }
];

const FILTER_ATTR_MAP = {
  methodology: "rcsb_entry_info.structure_determination_methodology",
  organism: "rcsb_entity_source_organism.scientific_name",
  taxonomy: "rcsb_entity_source_organism.taxonomy_lineage.name",
  experimental_method: "exptl.method",
  integrative_input: "rcsb_entry_info.selected_polymer_entity_types",
  polymer_entity_type: "entity_poly.rcsb_entity_polymer_type",
  symmetry_type: "rcsb_struct_symmetry.type",
  enzyme_class: "rcsb_polymer_entity.rcsb_ec_lineage.name",
  membrane_protein: "rcsb_polymer_entity_annotation.type",
  scop_class: "rcsb_polymer_instance_annotation.annotation_lineage.name"
};

// Build RCSB Search query
function buildSearchQuery({ keyword, start, rows, includeCSM, sortBy, sortDirection, filters }) {
  const isPdbId = keyword.trim().length === 4 && /^[a-z0-9]+$/i.test(keyword.trim());
  let textNode;

  if (isPdbId) {
    textNode = {
      type: "group",
      logical_operator: "or",
      nodes: [
        { type: "terminal", service: "text", parameters: { attribute: "rcsb_id", operator: "exact_match", value: keyword.trim().toUpperCase() } },
        { type: "terminal", service: "full_text", parameters: { value: keyword.trim() } }
      ]
    };
  } else {
    textNode = { type: "terminal", service: "full_text", parameters: { value: keyword.trim() } };
  }

  const nodes = [textNode];
  for (const [fname, values] of Object.entries(filters || {})) {
    if (!values || !values.length) continue;
    const attr = FILTER_ATTR_MAP[fname];
    if (attr) {
      nodes.push({
        type: "terminal",
        service: "text",
        parameters: { attribute: attr, operator: "in", value: values }
      });
    }
  }

  const queryNode = nodes.length > 1 ? { type: "group", logical_operator: "and", nodes } : nodes[0];

  const sortMap = {
    score: { sort_by: "score", direction: sortDirection },
    released: { sort_by: "rcsb_accession_info.initial_release_date", direction: sortDirection },
    pdb_id: { sort_by: "rcsb_id", direction: sortDirection }
  };

  return {
    query: queryNode,
    return_type: "entry",
    request_options: {
      paginate: { start, rows },
      results_content_type: ["experimental", ...(includeCSM ? ["computational"] : [])],
      sort: [sortMap[sortBy] || { sort_by: "score", direction: "desc" }],
      facets: FACETS
    }
  };
}

// Helper: bucket years
function bucketYears(items) {
  const bands = {};
  for (const it of items) {
    try {
      const yr = parseInt(String(it.key).slice(0, 4));
      if (isNaN(yr)) continue;
      const lo = Math.floor(yr / 5) * 5;
      const key = `${lo} - ${lo + 4}`;
      bands[key] = (bands[key] || 0) + it.count;
    } catch (e) {
      // skip
    }
  }
  return Object.entries(bands)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => ({ key: k, count: v }));
}

// REST Fallback for Structure details
async function fetchEntryViaRest(upper) {
  const base = "https://data.rcsb.org/rest/v1/core";
  
  // 1. Core entry
  const r = await axios.get(`${base}/entry/${upper}`, { timeout: 20000 });
  if (r.status === 404) throw new Error(`Structure not found: ${upper}`);
  const e = r.data;
  if (!e || typeof e !== "object") throw new Error(`Structure not found: ${upper}`);

  // 2. Polymer entity IDs
  const container = safeDict(e.rcsb_entry_container_identifiers);
  const rawIds = safeList(container.pointer_entity_ids || container.polymer_entity_ids);
  let entityIds = rawIds.map(String).filter(Boolean);
  if (!entityIds.length) {
    const n = parseInt(safeDict(e.rcsb_entry_info).polymer_entity_count || 0);
    entityIds = Array.from({ length: n }, (_, i) => String(i + 1));
  }

  // Fetch polymers in parallel
  const fetchPoly = async (eid) => {
    try {
      const pr = await axios.get(`${base}/polymer_entity/${upper}/${eid}`, { timeout: 10000 });
      if (pr.status === 200) return pr.data;
    } catch {}
    return null;
  };
  const polysRest = (await Promise.all(entityIds.slice(0, 6).map(fetchPoly))).filter(Boolean);

  // Fetch nonpolymers
  const nonpolyIds = safeList(container.non_polymer_entity_ids || container.nonpolymer_entity_ids);
  const fetchNonpoly = async (nid) => {
    try {
      const nr = await axios.get(`${base}/nonpolymer_entity/${upper}/${nid}`, { timeout: 10000 });
      if (nr.status === 200) return nr.data;
    } catch {}
    return null;
  };
  const nonpolyRest = (await Promise.all(nonpolyIds.slice(0, 10).map(fetchNonpoly))).filter(Boolean);

  // Collect instance tasks
  const instanceTasks = [];
  for (const data of nonpolyRest) {
    const ident = safeDict(data.rcsb_nonpolymer_entity_container_identifiers);
    const asymIds = safeList(ident.asym_ids);
    const cid = ident.nonpolymer_comp_id;
    for (const aid of asymIds) {
      instanceTasks.push({ cid, aid });
    }
  }

  // Fetch instances validation scores
  const fetchInstanceScore = async ({ cid, aid }) => {
    try {
      const ir = await axios.get(`${base}/nonpolymer_entity_instance/${upper}/${aid}`, { timeout: 5000 });
      if (ir.status === 200 && ir.data) {
        const idata = ir.data;
        const scoreList = safeList(idata.rcsb_nonpolymer_instance_validation_score);
        if (scoreList.length > 0) {
          const valScore = scoreList[0];
          const rscc = valScore.RSCC;
          const rsr = valScore.RSR;
          if (rscc !== undefined && rscc !== null) {
            return { id: cid, instance_id: aid, rscc, rsr };
          }
        }
      }
    } catch {}
    return null;
  };
  const ligandScores = (await Promise.all(instanceTasks.slice(0, 20).map(fetchInstanceScore))).filter(Boolean);

  if (nonpolyRest.length) {
    e.nonpolymer_entities = nonpolyRest;
  }

  // Fetch symmetry
  try {
    const ar = await axios.get(`${base}/assembly/${upper}/1`, { timeout: 8000 });
    if (ar.status === 200 && ar.data) {
      e.rcsb_struct_symmetry = safeList(ar.data.rcsb_struct_symmetry);
    }
  } catch {}

  const geomList = safeList(e.pdbx_vrpt_summary_geometry);
  const geom = geomList[0] || {};
  const diffrList = safeList(e.pdbx_vrpt_summary_diffraction);
  const diffr = diffrList[0] || {};
  const refineList = safeList(e.refine).map(safeDict);
  const refine = refineList[0] || {};

  const vs = {
    clashscore: geom.clashscore,
    percent_ramachandran_outliers: geom.percent_ramachandran_outliers,
    percent_rota_outliers: geom.percent_rotamer_outliers,
    percent_RSRZ_outliers: diffr.percent_RSRZ_outliers,
    DCC_Rfree: diffr.DCC_Rfree,
    DCC_R: diffr.DCC_R,
    PDB_Rfree: refine.ls_R_factor_R_free || refine.ls_rfactor_rfree,
    PDB_R: refine.ls_R_factor_R_work || refine.ls_rfactor_r_work,
    PDB_Robs: refine.ls_R_factor_obs || refine.ls_rfactor_r_obs,
    percent_rank_clashscore: null,
    percent_rank_percent_ramachandran_outliers: null,
    percent_rank_percent_rota_outliers: null,
    percent_rank_percent_RSRZ_outliers: null,
    percent_rank_DCC_Rfree: null
  };

  const polys = polysRest.map(p => {
    const containerIds = safeDict(p.rcsb_polymer_entity_container_identifiers);
    return {
      entity_id: containerIds,
      rcsb_polymer_entity: safeDict(p.rcsb_polymer_entity),
      rcsb_entity_source_organism: safeList(p.rcsb_entity_source_organism),
      entity_src_gen: safeList(p.entity_src_gen),
      entity_poly: safeDict(p.entity_poly),
      uniprots: [],
      rcsb_polymer_entity_feature: safeList(p.rcsb_polymer_entity_feature)
    };
  });

  return { entry: e, polys, vs, ligandScores };
}

// ── GET: /search ──
router.get("/search", async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const start = parseInt(req.query.start) || 0;
    const rows = parseInt(req.query.rows) || 10;
    const includeCSM = req.query.include_csm === "true";
    const sortBy = req.query.sort_by || "score";
    const sortDirection = req.query.sort_direction || "desc";

    const filterKeys = [
      "methodology", "organism", "taxonomy", "experimental_method", "integrative_input",
      "polymer_entity_type", "resolution", "release_date", "enzyme_class",
      "membrane_protein", "symmetry_type", "scop_class"
    ];
    const filters = {};
    for (const key of filterKeys) {
      if (req.query[key]) {
        filters[key] = req.query[key].split(",").map(x => x.trim()).filter(Boolean);
      }
    }

    // Cache lookup
    const cacheKey = JSON.stringify({ keyword, start, rows, includeCSM, sortBy, sortDirection, filters });
    if (SEARCH_CACHE[cacheKey]) {
      return res.json(SEARCH_CACHE[cacheKey]);
    }

    const searchQueryPayload = buildSearchQuery({ keyword, start, rows, includeCSM, sortBy, sortDirection, filters });
    
    let searchData;
    try {
      const searchRes = await axios.post(SEARCH_URL, searchQueryPayload, { timeout: 15000 });
      searchData = searchRes.data || {};
    } catch (e) {
      if (e.response && e.response.status === 204) {
        return res.json({ keyword, start, rows, returned: 0, total_count: 0, results: [], facets: {} });
      }
      throw e;
    }

    const resultSet = searchData.result_set || [];
    const graphqlData = {};
    if (resultSet.length > 0) {
      const ids = resultSet.map(item => item.identifier.split(":")[0].toUpperCase());
      try {
        const gqlRes = await gqlPost(SEARCH_GQL, { ids });
        const entries = safeList(gqlRes.data?.entries);
        for (const entry of entries) {
          if (entry && entry.rcsb_id) {
            graphqlData[entry.rcsb_id.toUpperCase()] = entry;
          }
        }
      } catch (ge) {
        console.error("RCSB GraphQL search details error:", ge.message);
      }
    }

    const results = [];
    for (const item of resultSet) {
      const pid = item.identifier.split(":")[0].toUpperCase();
      const meta = graphqlData[pid] || {};
      const acc = safeDict(meta.rcsb_accession_info);
      const ei = safeDict(meta.rcsb_entry_info);
      const exl = safeList(meta.exptl);
      const rv = safeList(ei.resolution_combined);

      const resObj = {
        pdb_id: pid,
        score: item.score || 0,
        image_url: `https://cdn.rcsb.org/images/structures/${pid.toLowerCase()}_assembly-1.jpeg`,
        title: safeDict(meta.struct).title || "N/A",
        release_date: (acc.initial_release_date || "").split("T")[0] || "N/A",
        deposit_date: (acc.deposit_date || "").split("T")[0] || "N/A",
        method: exl[0]?.method || "",
        resolution: rv.length > 0 ? `${rv[0]} Å` : "N/A",
        classification: safeDict(meta.struct_keywords).pdbx_keywords || "N/A",
        authors: safeList(meta.audit_author).map(a => a.name).filter(Boolean),
        organisms: [],
        macromolecules: []
      };

      const polys = safeList(meta.polymer_entities);
      if (polys.length > 0) {
        const orgs = [];
        const macs = [];
        for (const p of polys) {
          const sources = safeList(p.rcsb_entity_source_organism);
          for (const s of sources) {
            if (s.ncbi_scientific_name) orgs.push(s.ncbi_scientific_name);
          }

          const namesCombined = safeList(safeDict(p.rcsb_polymer_entity).rcsb_macromolecular_names_combined);
          if (namesCombined.length > 0) {
            for (const n of namesCombined) {
              if (n.name) macs.push(n.name);
            }
          } else if (safeDict(p.rcsb_polymer_entity).pdbx_description) {
            macs.push(safeDict(p.rcsb_polymer_entity).pdbx_description);
          }
        }
        resObj.organisms = [...new Set(orgs)];
        resObj.macromolecules = [...new Set(macs)];
      }
      results.push(resObj);
    }

    const facetsOut = {};
    const rawFacets = searchData.facets || [];
    for (const facet of rawFacets) {
      const name = facet.name;
      const buckets = facet.buckets || [];
      let items = [];
      for (const b of buckets) {
        let label = b.label || "";
        if (!label && (b.from !== undefined || b.to !== undefined)) {
          const lo = b.from;
          const hi = b.to;
          label = (hi === null || hi === undefined || hi >= 999) ? `> ${lo}` : `${lo} - ${hi}`;
        }
        if (!label && b.key) {
          label = String(b.key).slice(0, 4);
        }

        if (label && label.includes("-")) {
          const parts = label.split("-").map(p => p.trim());
          if (parts.length === 2) {
            const lo = parts[0];
            const hi = parts[1];
            try {
              if (parseFloat(hi) >= 999) {
                label = `> ${lo}`;
              } else {
                label = `${lo} - ${hi}`;
              }
            } catch (ve) {
              label = `${lo} - ${hi}`;
            }
          }
        }

        const count = b.population || 0;
        if (label && count > 0) {
          items.push({ key: label, count });
        }
      }

      if (name === "release_date") {
        items = bucketYears(items);
      }
      facetsOut[name] = items;
    }

    const resDict = {
      keyword,
      start,
      rows,
      returned: results.length,
      total_count: searchData.total_count || 0,
      results,
      facets: facetsOut
    };
    SEARCH_CACHE[cacheKey] = resDict;
    res.json(resDict);

  } catch (err) {
    console.error("PDB Search Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET: /structure/:pdb_id ──
router.get("/structure/:pdb_id", async (req, res) => {
  const upper = req.params.pdb_id.split(":")[0].toUpperCase();
  if (STRUCTURE_CACHE[upper]) {
    return res.json(STRUCTURE_CACHE[upper]);
  }

  try {
    let entry = null;
    let polys = [];
    let vs = {};
    let ligandScores = [];
    let refine = {};

    // 1. Try GraphQL first
    try {
      const result = await gqlPost(DETAIL_GQL, { id: upper });
      entry = result?.data?.entry;
    } catch (gqlErr) {
      console.warn(`RCSB GraphQL failed for ${upper}: ${gqlErr.message}. Falling back to REST API.`);
    }

    // 2. Fall back to REST if GQL is empty
    if (!entry) {
      const restResults = await fetchEntryViaRest(upper);
      entry = restResults.entry;
      polys = restResults.polys;
      vs = restResults.vs;
      ligandScores = restResults.ligandScores;
      refine = safeList(entry.refine).map(safeDict)[0] || {};
    } else {
      polys = entry.polymer_entities || [];
      refine = (entry.refine || [])[0] || {};
      const assemblies = entry.assemblies || [];
      const sym = assemblies[0]?.rcsb_struct_symmetry?.[0] || {};

      const geom = safeList(entry.pdbx_vrpt_summary_geometry)[0] || {};
      const diffr = safeList(entry.pdbx_vrpt_summary_diffraction)[0] || {};

      vs = {
        clashscore: geom.clashscore,
        percent_ramachandran_outliers: geom.percent_ramachandran_outliers,
        percent_rota_outliers: geom.percent_rotamer_outliers,
        percent_RSRZ_outliers: diffr.percent_RSRZ_outliers,
        DCC_Rfree: diffr.DCC_Rfree,
        DCC_R: diffr.DCC_R,
        PDB_Rfree: refine.ls_R_factor_R_free,
        PDB_R: refine.ls_R_factor_R_work,
        percent_rank_clashscore: null,
        percent_rank_percent_ramachandran_outliers: null,
        percent_rank_percent_rota_outliers: null,
        percent_rank_percent_RSRZ_outliers: null,
        percent_rank_DCC_Rfree: null
      };

      const nonpolyEntities = entry.nonpolymer_entities || [];
      for (const npe of nonpolyEntities) {
        const nc = safeDict(npe.nonpolymer_comp);
        const cc = safeDict(nc.chem_comp);
        const cid = cc.id || safeDict(npe.rcsb_nonpolymer_entity_container_identifiers).nonpolymer_comp_id;
        const instances = npe.nonpolymer_entity_instances || [];
        for (const inst of instances) {
          const instId = inst.rcsb_id || "";
          const asymId = instId.includes(".") ? instId.split(".").pop() : instId;
          const scores = inst.rcsb_nonpolymer_instance_validation_score || [];
          if (scores.length > 0) {
            const valScore = scores[0];
            const rscc = valScore.RSCC;
            const rsr = valScore.RSR;
            if (rscc !== undefined && rscc !== null) {
              ligandScores.push({ id: cid, instance_id: asymId, rscc, rsr });
            }
          }
        }
      }
    }

    const ei = safeDict(entry.rcsb_entry_info);
    const acc = safeDict(entry.rcsb_accession_info);
    const exl = safeList(entry.exptl);
    const exl0 = exl[0] || {};
    const nonpoly = safeList(entry.nonpolymer_entities);
    const rv = safeList(ei.resolution_combined);

    const organisms = [...new Set(
      polys.flatMap(p => safeList(p.rcsb_entity_source_organism).map(o => o.ncbi_scientific_name)).filter(Boolean)
    )];

    const expSystems = [...new Set(
      polys.flatMap(p => safeList(p.entity_src_gen).map(s => s.pdbx_host_org_scientific_name)).filter(Boolean)
    )];

    const mutation = polys.some(p => {
      const mut = (safeDict(p.rcsb_polymer_entity).pdbx_mutation || "").trim();
      return mut && mut !== "?" && mut.toUpperCase() !== "NO" && mut.toUpperCase() !== "NONE";
    }) ? "Yes" : "No";

    const symList = safeList(entry.rcsb_struct_symmetry);
    const sym = symList[0] || (entry.assemblies?.[0]?.rcsb_struct_symmetry?.[0]) || {};
    const symText = `${sym.type || "Asymmetric"} - ${sym.symbol || "C1"}`;

    const macromolecules = [];
    for (const p of polys) {
      const eidBlock = safeDict(p.entity_id);
      const entityId = eidBlock.entity_id || "";
      const chains = safeList(eidBlock.auth_asym_ids);
      const pe = safeDict(p.rcsb_polymer_entity);
      const polyBlock = safeDict(p.entity_poly);
      const seqLen = polyBlock.rcsb_sample_sequence_length;
      const polyType = polyBlock.type || "";

      const namesList = safeList(pe.rcsb_macromolecular_names_combined);
      const molName = namesList.map(n => n.name).filter(Boolean).join(", ") || pe.pdbx_description || "";
      
      const mutationRaw = (pe.pdbx_mutation || "").trim();
      let mutationCount = 0;
      if (mutationRaw && mutationRaw !== "?" && mutationRaw.toUpperCase() !== "NO" && mutationRaw.toUpperCase() !== "NONE") {
        const parsedCount = parseInt(mutationRaw);
        mutationCount = isNaN(parsedCount) ? mutationRaw.split(",").map(x => x.trim()).filter(Boolean).length : parsedCount;
      }

      const orgs = safeList(p.rcsb_entity_source_organism);
      const organism = orgs[0]?.ncbi_scientific_name || "";
      const taxId = orgs[0]?.ncbi_taxonomy_id || "";
      const uniprotsRaw = safeList(p.uniprots);
      const uniprotIds = uniprotsRaw.map(u => u.rcsb_id).filter(Boolean);

      macromolecules.push({
        entity_id: entityId,
        molecule: molName,
        chains,
        sequence_length: seqLen,
        type: polyType,
        organism,
        tax_id: taxId,
        mutation_count: mutationCount,
        uniprot_ids: uniprotIds,
        image_url: entityId ? `https://cdn.rcsb.org/images/entities/${upper.toLowerCase().slice(1, 3)}/${upper.toLowerCase()}/${upper.toLowerCase()}_${entityId}.jpeg` : null
      });
    }

    // Pre-fetch missing chemical names/formulas in parallel
    const neededCids = new Set();
    for (const nm of nonpoly) {
      const nc = safeDict(nm.nonpolymer_comp);
      const cc = safeDict(nc.chem_comp) || safeDict(nm.chem_comp);
      const ident = safeDict(nm.rcsb_nonpolymer_entity_container_identifiers);
      const cid = cc.id || nm.prd_id || safeDict(nm.pdbx_entity_nonpoly).comp_id || ident.nonpolymer_comp_id;
      if (cid && (!cc.name || !cc.formula)) {
        neededCids.add(cid.toUpperCase());
      }
    }
    const modResidues = safeList(entry.pdbx_struct_mod_residue);
    for (const mr of modResidues) {
      if (mr?.label_comp_id) {
        neededCids.add(mr.label_comp_id.toUpperCase());
      }
    }

    const uncachedCids = [...neededCids].filter(c => !CHEM_COMP_CACHE[c]);
    if (uncachedCids.length > 0) {
      await Promise.all(uncachedCids.map(fetchSingleChemComp));
    }

    // Build small molecules
    const smallMolecules = [];
    for (const nm of nonpoly) {
      const nc = safeDict(nm.nonpolymer_comp);
      const cc = safeDict(nc.chem_comp) || safeDict(nm.chem_comp);
      const desc = safeDict(nc.rcsb_chem_comp_descriptor) || safeDict(nm.rcsb_chem_comp_descriptor);
      const ident = safeDict(nm.rcsb_nonpolymer_entity_container_identifiers);
      const cid = cc.id || nm.prd_id || safeDict(nm.pdbx_entity_nonpoly).comp_id || ident.nonpolymer_comp_id;

      if (!cid) continue;

      const asymIds = safeList(ident.asym_ids);
      const authAsymIds = safeList(ident.auth_asym_ids);
      const chainsNm = [];
      const maxLen = Math.max(asymIds.length, authAsymIds.length);
      for (let i = 0; i < maxLen; i++) {
        const aid = asymIds[i] || "";
        const authAid = authAsymIds[i] || "";
        if (aid && authAid) {
          chainsNm.push(aid === authAid ? aid : `${aid} [auth ${authAid}]`);
        } else if (aid) {
          chainsNm.push(aid);
        } else if (authAid) {
          chainsNm.push(authAid);
        }
      }

      const relatedList = safeList(nc.pdbx_chem_comp_related || nm.pdbx_chem_comp_related);
      let parentId = null;
      for (const rel of relatedList) {
        if (rel?.relationship_type && ["PRECURSOR", "BASED ON"].includes(rel.relationship_type.toUpperCase())) {
          parentId = rel.related_id;
          break;
        }
      }
      if (!parentId && relatedList.length > 0) {
        parentId = relatedList[0]?.related_id;
      }

      let name = cc.name;
      let compType = cc.type;
      let formula = cc.formula;
      let smiles = desc.smiles || desc.SMILES;

      if (!name || !formula) {
        const cached = CHEM_COMP_CACHE[cid.toUpperCase()] || ["", "NON-POLYMER", "", ""];
        name = cached[0];
        compType = cached[1];
        formula = cached[2];
        smiles = cached[3];
      }

      smallMolecules.push({
        id: cid,
        name: name || "",
        type: compType || "NON-POLYMER",
        formula: formula || "",
        chains: chainsNm,
        parent: parentId,
        diagram_url: `https://cdn.rcsb.org/images/ccd/labeled/${cid.toUpperCase()[0]}/${cid.toUpperCase()}.svg`,
        smiles: smiles || ""
      });
    }

    // Build modified residues
    const modifiedResidues = [];
    const seenMod = {};
    for (const p of polys) {
      const eidBlock = safeDict(p.entity_id);
      const nstdMonomers = safeList(eidBlock.chem_comp_nstd_monomers);
      if (nstdMonomers.length === 0) continue;
      const chains = safeList(eidBlock.auth_asym_ids);

      const parentMap = {};
      const features = safeList(p.rcsb_polymer_entity_feature);
      for (const f of features) {
        if (f?.type === "modified_monomer") {
          let parentId = null;
          const props = safeList(f.additional_properties);
          for (const prop of props) {
            if (prop?.name === "PARENT_COMP_ID") {
              const vals = safeList(prop.values);
              if (vals.length > 0) parentId = vals[0];
            }
          }
          if (!parentId && f.name && f.name.includes("Parent monomer")) {
            parentId = f.name.split(" ").pop();
          }
          if (parentId) {
            for (const cm of nstdMonomers) {
              parentMap[cm] = parentId;
            }
          }
        }
      }

      for (const cm of nstdMonomers) {
        if (!cm) continue;
        const cmUpper = cm.toUpperCase();
        const parent = parentMap[cmUpper];
        if (!seenMod[cmUpper]) {
          seenMod[cmUpper] = { chains: new Set(), parent };
        }
        for (const ch of chains) {
          seenMod[cmUpper].chains.add(ch);
        }
      }
    }

    for (const [cid, info] of Object.entries(seenMod)) {
      const cached = CHEM_COMP_CACHE[cid.toUpperCase()] || ["", "L-PEPTIDE LINKING", "", ""];
      modifiedResidues.push({
        id: cid,
        name: cached[0] || cid,
        type: cached[1] || "L-PEPTIDE LINKING",
        formula: cached[2],
        chains: [...info.chains].sort(),
        parent: info.parent || null,
        diagram_url: `https://cdn.rcsb.org/images/ccd/labeled/${cid[0]}/${cid}.svg`,
        smiles: cached[3]
      });
    }

    const stoichiometryVal = (
      sym.stoichiometry?.stoichiometry_string
      || (Array.isArray(sym.stoichiometry) ? (typeof sym.stoichiometry[0] === "string" ? sym.stoichiometry.join(", ") : sym.stoichiometry[0]?.stoichiometry_string) : null)
      || "N/A"
    );

    const resData = {
      pdb_id: upper,
      title: safeDict(entry.struct).title || "N/A",
      deposit_date: (acc.deposit_date || "").split("T")[0] || "N/A",
      release_date: (acc.initial_release_date || "").split("T")[0] || "N/A",
      method: exl0.method || "",
      classification: safeDict(entry.struct_keywords).pdbx_keywords || "N/A",
      authors: safeList(entry.audit_author).map(a => a.name).filter(Boolean),
      organisms,
      expression_systems: expSystems,
      mutation,
      resolution: rv.length > 0 ? `${rv[0]} Å` : "N/A",
      image_url: `https://cdn.rcsb.org/images/structures/${upper.toLowerCase()}_assembly-1.jpeg`,
      molecular_weight: ei.molecular_weight,
      deposited_atom_count: ei.deposited_atom_count,
      modeled_residue_count: ei.deposited_modeled_polymer_monomer_count,
      deposited_residue_count: ei.deposited_polymer_monomer_count,
      unique_chains: ei.polymer_entity_count_protein || ei.polymer_entity_count,
      conformer_count: ei.conformer_count,
      r_free: fmtNum(refine.ls_R_factor_R_free),
      r_work: fmtNum(refine.ls_R_factor_R_work),
      r_obs: fmtNum(refine.ls_R_factor_obs),
      starting_model: refine.pdbx_starting_model,
      symmetry_kind: sym.kind || "Asymmetric",
      symmetry_symbol: sym.symbol || "C1",
      symmetry_type: sym.type || "Asymmetric",
      oligomeric_state: sym.oligomeric_state || "N/A",
      stoichiometry: stoichiometryVal,
      validation: {
        clashscore: fmtNum(vs.clashscore, 1),
        rama_outliers: fmtNum(vs.percent_ramachandran_outliers, 1),
        sidechain_outliers: fmtNum(vs.percent_rota_outliers, 1),
        rsrz_outliers: fmtNum(vs.percent_RSRZ_outliers, 1),
        dcc_rfree: fmtNum(vs.DCC_Rfree),
        dcc_r: fmtNum(vs.DCC_R),
        pdb_rfree: fmtNum(vs.PDB_Rfree),
        pdb_r: fmtNum(vs.PDB_R),
        pct_clashscore: fmtNum(vs.percent_rank_clashscore, 1),
        pct_rama: fmtNum(vs.percent_rank_percent_ramachandran_outliers, 1),
        pct_sidechain: fmtNum(vs.percent_rank_percent_rota_outliers, 1),
        pct_rsrz: fmtNum(vs.percent_rank_percent_RSRZ_outliers, 1),
        pct_rfree: fmtNum(vs.percent_rank_DCC_Rfree, 1)
      },
      has_ligand: nonpoly.length > 0 || ligandScores.length > 0,
      ligand_scores: ligandScores,
      macromolecules,
      small_molecules: smallMolecules,
      modified_residues: modifiedResidues
    };

    STRUCTURE_CACHE[upper] = resData;
    res.json(resData);

  } catch (err) {
    console.error(`PDB Structure Details Error for ${upper}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET: /fasta/:pdb_id ──
router.get("/fasta/:pdb_id", async (req, res) => {
  const upper = req.params.pdb_id.split(":")[0].toUpperCase();
  const url = `https://www.rcsb.org/fasta/entry/${upper}/display`;
  try {
    const r = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 12000,
      responseType: "text"
    });
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(r.data);
  } catch (ex) {
    console.error(`FASTA Proxy Error for ${upper}:`, ex.message);
    res.status(502).json({ error: `Could not fetch FASTA sequence: ${ex.message}` });
  }
});

module.exports = router;
