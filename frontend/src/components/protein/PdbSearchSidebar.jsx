import React, { useState, useEffect } from 'react';

const WHITELIST = {
  methodology: [
    "experimental",
    "integrative"
  ],
  organism: [
    "Homo sapiens",
    "Mus musculus",
    "Severe acute respiratory syndrome coronavirus 2",
    "synthetic construct",
    "Rattus norvegicus",
    "Escherichia coli",
    "Human immunodeficiency virus 1",
    "Bos taurus",
    "Lama glama",
    "Sus scrofa",
    "Tequatrovirus T4",
    "Saccharomyces cerevisiae",
    "Escherichia coli K-12",
    "Arabidopsis thaliana",
    "Influenza A virus",
    "Oryctolagus cuniculus",
    "Saccharomyces cerevisiae S288C",
    "Macaca mulatta",
    "Drosophila melanogaster",
    "Cricetulus griseus",
    "Thermus thermophilus HB8",
    "Gallus gallus",
    "Mycobacterium tuberculosis H37Rv",
    "Trypanosoma brucei brucei",
    "Staphylococcus aureus",
    "Bacillus subtilis",
    "Plasmodium falciparum",
    "Danio rerio",
    "Hirudo medicinalis",
    "Tetronarce californica",
    "Pseudomonas aeruginosa",
    "Vicugna pacos",
    "Streptomyces pseudogriseolus",
    "Mycobacterium tuberculosis",
    "Listeria monocytogenes EGD-e",
    "Xenopus laevis",
    "Ovis aries",
    "Canis lupus familiaris",
    "unidentified",
    "Pseudomonas aeruginosa PAO1",
    "Geobacillus stearothermophilus",
    "Thermochaetoides thermophila DSM 1495",
    "Aequorea victoria",
    "Trichoderma reesei",
    "Caenorhabditis elegans",
    "Campylobacter jejuni",
    "Oryza sativa Japonica Group",
    "Thermus thermophilus",
    "Aspergillus fumigatus",
    "Candida albicans",
    "Thermotoga maritima",
    "Thermotoga maritima MSB8",
    "Plasmodium falciparum 3D7",
    "Zea mays",
    "Klebsiella pneumoniae",
    "Momordica balsamina",
    "Aspergillus niger",
    "Influenza A virus (A/Hong Kong/1/1968(H3N2))",
    "Middle East respiratory syndrome-related coronavirus",
    "Hordeum vulgare subsp. vulgare",
    "Leishmania major",
    "Trypanosoma brucei",
    "Equus caballus",
    "Trypanosoma cruzi",
    "Bacillus subtilis subsp. subtilis str. 168",
    "Lactococcus lactis",
    "Escherichia coli BL21(DE3)",
    "Mycolicibacterium smegmatis MC2 155",
    "Panus similis",
    "Pseudomonas putida",
    "Toxoplasma gondii",
    "Trametes ochracea",
    "Triticum aestivum",
    "Aplysia californica",
    "Aspergillus oryzae RIB40",
    "Pyrococcus abyssi GE5",
    "Phanerodontia chrysosporium",
    "Acinetobacter baumannii",
    "Severe acute respiratory syndrome coronavirus",
    "Candida albicans SC5314",
    "Thermus thermophilus HB27",
    "dengue virus type 2",
    "Aspergillus oryzae",
    "Betula pendula",
    "Lymnaea stagnalis",
    "Streptococcus pneumoniae",
    "Orthohepacivirus hominis",
    "Staphylococcus aureus subsp. aureus Mu50",
    "Thermococcus profundus",
    "Ebola virus - Mayinga, Zaire, 1976",
    "Eptatretus burgeri",
    "Scheffersomyces stipitis CBS 6054",
    "Aspergillus fumigatus Af293",
    "Human betaherpesvirus 5",
    "Human coronavirus HKU1",
    "Influenza A virus (A/California/04/2009(H1N1))",
    "Saccharolobus solfataricus",
    "Leishmania mexicana",
    "Salmonella enterica subsp. enterica serovar Typhimurium",
    "Severe acute respiratory syndrome-related coronavirus",
    "Amanita phalloides",
    "Mesocricetus auratus",
    "Cricetus cricetus",
    "Human poliovirus 1 Mahoney",
    "Oplophorus gracilirostris",
    "Xenopus tropicalis",
    "Rattus",
    "Rattus rattus",
    "Escherichia phage EcSzw-2",
    "HIV-1 M:B_HXB2R",
    "Clostridium perfringens",
    "Clostridium botulinum",
    "Glossina morsitans morsitans",
    "Spodoptera exigua",
    "Sus barbatus",
    "Aquifex aeolicus",
    "Ecballium elaterium",
    "Human mastadenovirus C",
    "Influenza A virus (A/Victoria/3/1975(H3N2))",
    "Meleagris gallopavo",
    "Spodoptera frugiperda",
    "Avena sativa",
    "Camelus bactrianus",
    "Clostridium pasteurianum",
    "DNA molecule",
    "Dictyostelium discoideum",
    "Human coxsackievirus A9 (strain Griggs)",
    "Niallia circulans",
    "Poliovirus type 3 (strains P3/LEON/37 AND P3/LEON 12A[1]B)",
    "Aquifex aeolicus VF5",
    "Chlamydia trachomatis",
    "Coxsackievirus A21",
    "Cricket paralysis virus",
    "Enterobacteria phage RB59",
    "Homo",
    "Mycolicibacterium vanbaalenii PYR-1",
    "Naja sagittifera",
    "Pan troglodytes",
    "Phage display vector pTDisp",
    "SARS bat coronavirus",
    "rhinovirus A16",
    "Acetivibrio thermocellus",
    "Bison bison",
    "Bovine enterovirus strain VG-5-27",
    "Camelus dromedarius",
    "Chromobacterium violaceum",
    "Dendroaspis angusticeps",
    "Escherichia coli O157:H7",
    "Geobacillus kaustophilus",
    "Haemophilus influenzae Rd KW20",
    "Hasarius adansoni",
    "Helicobacter pylori",
    "Hepatitis B virus",
    "Human adenovirus 2",
    "Human gammaherpesvirus 8",
    "Legionella pneumophila subsp. pneumophila str. Philadelphia 1",
    "Leiurus hebraeus"
  ],
  taxonomy: [
    "Eukaryota",
    "Bacteria",
    "Riboviria",
    "other sequences",
    "Duplodnaviria",
    "Archaea",
    "unclassified sequences",
    "Varidnaviria",
    "Floreoviria",
    "Riboviria (RNA viruses and viroids)",
    "Bacteria (eubacteria)",
    "unclassified bacterial viruses",
    "Viruses incertae sedis",
    "Adnaviria",
    "Singelaviria"
  ],
  experimental_method: [
    "X-RAY DIFFRACTION",
    "ELECTRON MICROSCOPY",
    "SOLUTION NMR",
    "NEUTRON DIFFRACTION",
    "ELECTRON CRYSTALLOGRAPHY",
    "POWDER DIFFRACTION",
    "SOLUTION SCATTERING",
    "SOLID-STATE NMR",
    "EPR",
    "FIBER DIFFRACTION"
  ],
  integrative_input: [
    "Crosslinking-MS data",
    "Experimental model",
    "Comparative model",
    "De Novo model",
    "3DEM volume",
    "Mutagenesis data",
    "NMR data",
    "Other",
    "Mass Spectrometry data",
    "2DEM class average",
    "H/D exchange data"
  ],
  polymer_entity_type: [
    "Protein",
    "RNA",
    "DNA",
    "NA-hybrid",
    "Other"
  ],
  resolution: [
    "0.5 - 1.0",
    "1.0 - 1.5",
    "1.5 - 2.0",
    "2.0 - 2.5",
    "2.5 - 3.0",
    "3.0 - 3.5",
    "3.5 - 4.0",
    "4.0 - 4.5",
    "> 4.5"
  ],
  release_date: [
    "1975 - 1979",
    "1980 - 1984",
    "1985 - 1989",
    "1990 - 1994",
    "1995 - 1999",
    "2000 - 2004",
    "2005 - 2009",
    "2010 - 2014",
    "2015 - 2019",
    "2020 - 2024",
    "2025 - 2029"
  ],
  enzyme_class: [
    "Hydrolases",
    "Transferases",
    "Oxidoreductases",
    "Translocases",
    "Isomerases",
    "Lyases",
    "Ligases"
  ],
  membrane_protein: [
    "PDBTM",
    "mpstruc",
    "OPM",
    "MemProtMD"
  ],
  symmetry_type: [
    "Asymmetric",
    "Cyclic",
    "Dihedral",
    "Icosahedral",
    "Tetrahedral",
    "Helical",
    "Octahedral"
  ],
  scop_class: [
    "Alpha and beta proteins (a/b)",
    "All beta proteins",
    "Alpha and beta proteins (a+b)",
    "Artifacts",
    "All alpha proteins",
    "Small proteins",
    "Coiled coil proteins",
    "Multi-domain proteins (alpha and beta)",
    "Membrane and cell surface proteins and peptides",
    "Peptides",
    "Low resolution protein structures",
    "Designed proteins"
  ]
};

const EMPTY = {
  methodology:[], organism:[], taxonomy:[], experimental_method:[],
  integrative_input:[], polymer_entity_type:[], resolution:[], release_date:[],
  enzyme_class:[], membrane_protein:[], symmetry_type:[], scop_class:[]
};

const filterItems = (facetKey, rawItems) => {
  const allowed = WHITELIST[facetKey];
  if (!allowed) return rawItems || [];
  const allowedSet = new Set(allowed);
  return (rawItems || []).filter(item => allowedSet.has(item.key));
};

function Section({ title, facetKey, items = [], selected = [], onToggle, globalOpenState }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 10);

  useEffect(() => {
    if (globalOpenState === 'open') {
      setOpen(true);
    } else if (globalOpenState === 'close') {
      setOpen(false);
    }
  }, [globalOpenState]);

  return (
    <div className={`pdb-filter-section ${open ? 'open' : ''}`}>
      <div className="pdb-filter-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="pdb-filter-body">
          {items.length === 0 && <div style={{ color: '#aaa', fontSize: 11 }}>No data</div>}
          {visible.map(item => (
            <label key={item.key} className="pdb-filter-item">
              <input type="checkbox"
                checked={selected.includes(item.key)}
                onChange={() => onToggle(facetKey, item.key)} />
              <span style={{ flex: 1 }}>{item.key}</span>
              <span className="pdb-filter-count">{item.count.toLocaleString()}</span>
            </label>
          ))}
          {items.length > 10 && (
            <div onClick={() => setShowAll(s => !s)}
              style={{ color: '#2563eb', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
              {showAll ? '▲ Less...' : 'More...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PdbSearchSidebar({ facets = {}, filters = {}, onFilterChange }) {
  const [globalOpenState, setGlobalOpenState] = useState(null);
  const [refinementsOpen, setRefinementsOpen] = useState(true);

  const toggle = (type, key) => {
    const cur = filters[type] || [];
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
    onFilterChange({ ...filters, [type]: next });
  };

  const hasAnyFilter = Object.values(filters).some(arr => arr && arr.length > 0);

  const handleRefinementAction = (e) => {
    const val = e.target.value;
    if (val === 'default') {
      onFilterChange(EMPTY);
      setGlobalOpenState('close');
      setRefinementsOpen(false);
      setTimeout(() => setGlobalOpenState(null), 50);
    } else if (val === 'clear') {
      onFilterChange(EMPTY);
    } else if (val === 'expand') {
      setGlobalOpenState('open');
      setTimeout(() => setGlobalOpenState(null), 50);
    } else if (val === 'collapse') {
      setGlobalOpenState('close');
      setTimeout(() => setGlobalOpenState(null), 50);
    }
  };

  const sortedRelease = [...filterItems("release_date", facets.release_date || [])].sort((a, b) => parseInt(a.key) - parseInt(b.key));

  return (
    <div className="pdb-sidebar">
      {/* Master Refinements Accordion Header */}
      <div className="pdb-filter-section" style={{ border: 'none', background: 'transparent', marginBottom: 0 }}>
        <div className="pdb-filter-header" 
          onClick={() => setRefinementsOpen(o => !o)}
          style={{ borderRadius: '5px' }}
        >
          <span>Refinements</span>
          <span style={{ fontSize: 10 }}>{refinementsOpen ? '▲' : '▼'}</span>
        </div>

        {refinementsOpen && (
          <div style={{ marginTop: '12px' }}>
            {/* Actions Dropdown inside refinements */}
            <div style={{
              border: '1px solid #b0c4d8',
              borderRadius: '4px',
              marginBottom: '12px',
              background: '#f8fafc',
              padding: '10px 12px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: 700, color: '#1b3a5c', fontSize: '12px' }}>
                  Filter Actions
                </span>
                {hasAnyFilter && (
                  <span style={{
                    background: '#e67e22',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '9px',
                    fontWeight: 700
                  }}>
                    Active
                  </span>
                )}
              </div>
              <select
                onChange={handleRefinementAction}
                value=""
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #ccd8e8',
                  borderRadius: '4px',
                  color: '#1b3a5c',
                  background: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="" disabled>Select Action...</option>
                <option value="default">Back to Default</option>
                <option value="clear">Clear All Filters</option>
                <option value="expand">Expand All Categories</option>
                <option value="collapse">Collapse All Categories</option>
              </select>
            </div>

            {/* Collapsed Category Accordions */}
            <Section title="Structure Determination Methodology" facetKey="methodology" items={filterItems("methodology", facets.methodology)} selected={filters.methodology || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Scientific Name of Source Organism" facetKey="organism" items={filterItems("organism", facets.organism)} selected={filters.organism || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Taxonomy" facetKey="taxonomy" items={filterItems("taxonomy", facets.taxonomy)} selected={filters.taxonomy || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Experimental Method" facetKey="experimental_method" items={filterItems("experimental_method", facets.experimental_method)} selected={filters.experimental_method || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Integrative Input Data" facetKey="integrative_input" items={filterItems("integrative_input", facets.integrative_input)} selected={filters.integrative_input || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Polymer Entity Type" facetKey="polymer_entity_type" items={filterItems("polymer_entity_type", facets.polymer_entity_type)} selected={filters.polymer_entity_type || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Refinement Resolution (Å)" facetKey="resolution" items={filterItems("resolution", facets.resolution)} selected={filters.resolution || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Release Date" facetKey="release_date" items={sortedRelease} selected={filters.release_date || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Enzyme Classification Name" facetKey="enzyme_class" items={filterItems("enzyme_class", facets.enzyme_class)} selected={filters.enzyme_class || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Membrane Protein Annotation" facetKey="membrane_protein" items={filterItems("membrane_protein", facets.membrane_protein)} selected={filters.membrane_protein || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="Symmetry Type" facetKey="symmetry_type" items={filterItems("symmetry_type", facets.symmetry_type)} selected={filters.symmetry_type || []} onToggle={toggle} globalOpenState={globalOpenState} />
            <Section title="SCOP Classification" facetKey="scop_class" items={filterItems("scop_class", facets.scop_class)} selected={filters.scop_class || []} onToggle={toggle} globalOpenState={globalOpenState} />
          </div>
        )}
      </div>
    </div>
  );
}
