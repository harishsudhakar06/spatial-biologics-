import api from "../api";

export async function searchProteins({
  keyword, start = 0, rows = 10, include_csm = false,
  sort_by = 'score', sort_direction = 'desc', filters = {}
}) {
  const params = new URLSearchParams({ keyword, start, rows, include_csm, sort_by, sort_direction });
  const filterKeys = [
    'methodology','organism','taxonomy','experimental_method','integrative_input',
    'polymer_entity_type','resolution','release_date','enzyme_class',
    'membrane_protein','symmetry_type','scop_class'
  ];
  filterKeys.forEach(k => {
    if (filters[k]?.length) params.append(k, filters[k].join(','));
  });
  const res = await api.get(`/pdb/search?${params}`);
  return res.data;
}

export async function fetchStructure(pdbId) {
  const res = await api.get(`/pdb/structure/${pdbId}`);
  return res.data;
}

export async function fetchFasta(pdbId) {
  const res = await api.get(`/pdb/fasta/${pdbId}`);
  return res.data;
}
