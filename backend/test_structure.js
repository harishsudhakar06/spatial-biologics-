const axios = require('axios');

const GRAPHQL_URL = "https://data.rcsb.org/graphql";

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

function safeDict(v) { return (v && typeof v === "object" && !Array.isArray(v)) ? v : {}; }
function safeList(v) { return Array.isArray(v) ? v : []; }
function fmtNum(v, decimals = 3) {
  if (v === null || v === undefined) return null;
  const num = parseFloat(v);
  return isNaN(num) ? null : parseFloat(num.toFixed(decimals));
}

async function testFetch(pdbId) {
  const upper = pdbId.toUpperCase();
  try {
    console.log(`Testing fetch for ${upper}...`);
    const res = await axios.post(GRAPHQL_URL, { query: DETAIL_GQL, variables: { id: upper } }, { timeout: 20000 });
    console.log("GraphQL raw response status:", res.status);
    if (res.data.errors) {
      console.log("GraphQL Errors:", JSON.stringify(res.data.errors, null, 2));
    }
    const entry = res?.data?.data?.entry;
    if (!entry) {
      console.log("GraphQL entry was null, would fall back to REST.");
      return;
    }

    console.log("GraphQL entry keys:", Object.keys(entry));
    
    const polys = entry.polymer_entities || [];
    const refine = (entry.refine || [])[0] || {};
    const assemblies = entry.assemblies || [];
    const sym = assemblies[0]?.rcsb_struct_symmetry?.[0] || {};

    const geom = safeList(entry.pdbx_vrpt_summary_geometry)[0] || {};
    const diffr = safeList(entry.pdbx_vrpt_summary_diffraction)[0] || {};

    const vs = {
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

    const ligandScores = [];
    const nonpolyEntities = entry.nonpolymer_entities || [];
    for (const npe of nonpolyEntities) {
      const nc = safeDict(npe.nonpolymer_comp);
      const cc = safeDict(nc.chem_comp);
      const containerIdentifiers = safeDict(npe.rcsb_nonpolymer_entity_container_identifiers);
      const cid = cc.id || containerIdentifiers.nonpolymer_comp_id;
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

    console.log("Basic fields parsed successfully.");

    const symList = safeList(entry.rcsb_struct_symmetry);
    const symObj = symList[0] || (entry.assemblies?.[0]?.rcsb_struct_symmetry?.[0]) || {};
    const symText = `${symObj.type || "Asymmetric"} - ${symObj.symbol || "C1"}`;

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
        uniprot_ids: uniprotIds
      });
    }
    console.log("Macromolecules parsed successfully.");

    // Pre-fetch missing chemical names/formulas in parallel
    const neededCids = new Set();
    for (const nm of nonpoly) {
      const nc = safeDict(nm.nonpolymer_comp);
      const cc = safeDict(nc.chem_comp) || safeDict(nm.chem_comp);
      const containerIdentifiers = safeDict(nm.rcsb_nonpolymer_entity_container_identifiers);
      const cid = cc.id || nm.prd_id || safeDict(nm.pdbx_entity_nonpoly).comp_id || containerIdentifiers.nonpolymer_comp_id;
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

    console.log("Needed CIDs:", [...neededCids]);

    // Build small molecules
    const smallMolecules = [];
    for (const nm of nonpoly) {
      const nc = safeDict(nm.nonpolymer_comp);
      const cc = safeDict(nc.chem_comp) || safeDict(nm.chem_comp);
      const desc = safeDict(nc.rcsb_chem_comp_descriptor) || safeDict(nm.rcsb_chem_comp_descriptor);
      const containerIdentifiers = safeDict(nm.rcsb_nonpolymer_entity_container_identifiers);
      const cid = cc.id || nm.prd_id || safeDict(nm.pdbx_entity_nonpoly).comp_id || containerIdentifiers.nonpolymer_comp_id;

      if (!cid) continue;

      const asymIds = safeList(containerIdentifiers.asym_ids);
      const authAsymIds = safeList(containerIdentifiers.auth_asym_ids);
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

      smallMolecules.push({
        id: cid,
        name: name || "",
        type: compType || "NON-POLYMER",
        formula: formula || "",
        chains: chainsNm,
        parent: parentId,
        smiles: smiles || ""
      });
    }

    console.log("Small molecules parsed successfully.");

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
      modifiedResidues.push({
        id: cid,
        name: cid,
        type: "L-PEPTIDE LINKING",
        formula: "",
        chains: [...info.chains].sort(),
        parent: info.parent || null,
        smiles: ""
      });
    }

    console.log("Modified residues parsed successfully.");

    const stoichiometryVal = (
      symObj.stoichiometry?.stoichiometry_string
      || (Array.isArray(symObj.stoichiometry) ? (typeof symObj.stoichiometry[0] === "string" ? symObj.stoichiometry.join(", ") : symObj.stoichiometry[0]?.stoichiometry_string) : null)
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
      symmetry_kind: symObj.kind || "Asymmetric",
      symmetry_symbol: symObj.symbol || "C1",
      symmetry_type: symObj.type || "Asymmetric",
      oligomeric_state: symObj.oligomeric_state || "N/A",
      stoichiometry: stoichiometryVal,
      validation: vs,
      has_ligand: nonpoly.length > 0 || ligandScores.length > 0,
      ligand_scores: ligandScores,
      macromolecules,
      small_molecules: smallMolecules,
      modified_residues: modifiedResidues
    };

    console.log("Success! Full details parsed successfully.");
    console.log(JSON.stringify(resData, null, 2).slice(0, 500) + "\n...[TRUNCATED]");
  } catch (err) {
    console.error("FAILED FETCH ERROR:", err);
  }
}

testFetch("2KBC");
