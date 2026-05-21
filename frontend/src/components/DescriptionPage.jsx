import React, { useState } from "react";

export default function DescriptionPage({ compound, onBack }) {
  const {
    name, cid, formula, weight, image2D,
    description, allDescriptions, synonyms,
    smiles, inchikey, inchi, createDate,
    xlogp, hbondDonor, hbondAcceptor,
    rotatableBonds, exactMass, tpsa,
    has2D, has3D, hasCrystal
  } = compound;

  const [structType, setStructType] = useState(null);
  const [zoom, setZoom] = useState(1);

  const descriptions = allDescriptions?.length > 0
    ? allDescriptions
    : description
      ? [{ text: description, source: "" }]
      : [];

  return (
    <div className="desc-page">
      {/* Header */}
      <div className="desc-page-header">
        <button className="btn-back" onClick={onBack}>← Back to Results</button>
        <div className="desc-page-title">
          <h1>{synonyms?.[0] || name}</h1>
          <p>Compound CID: {cid} &nbsp;|&nbsp; {formula} &nbsp;|&nbsp; {weight} g/mol</p>
        </div>
      </div>

      <div className="desc-page-body">

        {/* Hero */}
        <div className="desc-hero">
          <div className="desc-hero-img" onContextMenu={e => e.preventDefault()}>
            <img
              src={image2D} alt={name} draggable="false"
              onContextMenu={e => e.preventDefault()}
            />
            <div className="desc-hero-caption">2D Structure</div>
          </div>
          <div className="desc-hero-quick">
            <h2>Quick Facts</h2>
            <div className="quick-grid">
              {[
                ["Formula", formula],
                ["MW", weight + " g/mol"],
                ["XLogP", xlogp],
                ["H-Bond Donor", hbondDonor],
                ["H-Bond Acceptor", hbondAcceptor],
                ["TPSA", tpsa + " Å²"],
              ].map(([k,v]) => (
                <div key={k} className="quick-item">
                  <div className="quick-key">{k}</div>
                  <div className="quick-val">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Structure Viewer */}
        <div className="desc-section">
          <h2 className="desc-section-title">🔭 Structure Viewer</h2>
          <div className="struct-type-tabs">
            {has2D && <button className={`struct-tab ${structType==="2d"?"active":""}`} onClick={() => { setStructType("2d"); setZoom(1); }}>2D Structure</button>}
            {has3D && <button className={`struct-tab ${structType==="3d"?"active":""}`} onClick={() => { setStructType("3d"); setZoom(1); }}>3D Conformer</button>}
            {hasCrystal && <button className={`struct-tab ${structType==="crystal"?"active":""}`} onClick={() => { setStructType("crystal"); setZoom(1); }}>Crystal</button>}
            {!structType && <span style={{fontSize:"0.8rem",color:"var(--muted)"}}>Click a tab to view structure</span>}
          </div>

          {structType === "2d" && (
            <div>
              <div className="struct-toolbar">
                <button className="tool-btn" onClick={() => setZoom(z => Math.min(z+0.25, 4))}>🔍 Zoom In</button>
                <button className="tool-btn" onClick={() => setZoom(z => Math.max(z-0.25, 0.3))}>🔎 Zoom Out</button>
                <button className="tool-btn" onClick={() => setZoom(1)}>↺ Reset</button>
                <span className="tool-label">Zoom: {Math.round(zoom*100)}%</span>
              </div>
              <div className="struct-viewer-2d">
                <div style={{transform:`scale(${zoom})`,transition:"transform 0.2s",transformOrigin:"center center"}}>
                  <img
                    src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=600x600`}
                    alt="2D" draggable="false"
                    onContextMenu={e => e.preventDefault()}
                    style={{maxWidth:"560px",maxHeight:"500px",display:"block",margin:"0 auto"}}
                  />
                </div>
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> A 2D structure shows atoms and bonds in a flat diagram. Lines = bonds, letters = atoms (C=Carbon, O=Oxygen, N=Nitrogen, H=Hydrogen).
              </div>
            </div>
          )}

          {structType === "3d" && (
            <div>
              <div className="struct-toolbar">
                <span className="tool-label">🖱️ Drag to rotate &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp; Right-click to pan</span>
              </div>
              <div className="struct-embed-wrap">
                <iframe
                  src={`https://embed.molview.org/v1/?mode=balls&cid=${cid}`}
                  title="3D Structure"
                  width="100%" height="480px"
                  style={{border:"none",display:"block"}}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> 3D view shows the actual shape of the molecule. Colors: grey=Carbon, red=Oxygen, blue=Nitrogen, white=Hydrogen. Drag to rotate, scroll to zoom!
              </div>
            </div>
          )}

          {structType === "crystal" && (
            <div>
              <div className="struct-toolbar">
                <span className="tool-label">🖱️ Drag to rotate &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp; Right-click to pan</span>
              </div>
              <div className="struct-embed-wrap">
                <iframe
                  src={`https://embed.molview.org/v1/?mode=wireframe&cid=${cid}`}
                  title="Crystal Structure"
                  width="100%" height="480px"
                  style={{border:"none",display:"block"}}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> Crystal wireframe shows how molecules pack in a repeating 3D pattern. Only bonds (lines) are shown — easier to see the overall shape.
              </div>
            </div>
          )}
        </div>

        {/* Descriptions from PubChem */}
        <div className="desc-section">
          <h2 className="desc-section-title">🔬 Description</h2>
          {descriptions.length === 0 && (
            <p className="desc-section-text" style={{color:"var(--muted)"}}>No description available for this compound.</p>
          )}
          {descriptions.map((d, i) => (
            <div key={i} className="desc-entry">
              <p className="desc-section-text">{d.text}</p>
              {d.source && <div className="desc-source">{d.source}</div>}
            </div>
          ))}
        </div>

        {/* Chemical Identity */}
        <div className="desc-section">
          <h2 className="desc-section-title">🧪 Chemical Identity</h2>
          <table className="desc-table">
            <tbody>
              {[
                ["Compound CID", cid],
                ["IUPAC Name", name],
                ["Molecular Formula", formula],
                ["Molecular Weight", weight + " g/mol"],
                ["SMILES", smiles],
                ["InChIKey", inchikey],
                ["InChI", inchi],
                ["Create Date", createDate],
              ].filter(([,v]) => v && v !== "N/A" && v !== "").map(([k,v]) => (
                <tr key={k}>
                  <td className="desc-td-key">{k}</td>
                  <td className="desc-td-val">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Physical Properties */}
        <div className="desc-section">
          <h2 className="desc-section-title">⚗️ Physical & Chemical Properties</h2>
          <table className="desc-table">
            <tbody>
              {[
                ["XLogP (Lipophilicity)", xlogp],
                ["H-Bond Donor Count", hbondDonor],
                ["H-Bond Acceptor Count", hbondAcceptor],
                ["Rotatable Bond Count", rotatableBonds],
                ["Exact Mass", exactMass],
                ["TPSA", tpsa + " Å²"],
              ].filter(([,v]) => v !== undefined && v !== "N/A").map(([k,v]) => (
                <tr key={k}>
                  <td className="desc-td-key">{k}</td>
                  <td className="desc-td-val">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Synonyms */}
        {synonyms?.length > 0 && (
          <div className="desc-section">
            <h2 className="desc-section-title">🏷️ Also Known As</h2>
            <div className="syn-wrap">
              {synonyms.map((s,i) => (
                <span key={i} className="syn-chip">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Student Guide */}
        <div className="desc-section">
          <h2 className="desc-section-title">📚 Student Guide</h2>
          <div className="guide-grid">
            {[
              ["Molecular Formula", "Shows which atoms and how many are in the molecule. Example: C9H8O4 means 9 Carbon, 8 Hydrogen, 4 Oxygen atoms."],
              ["Molecular Weight", "The total mass of one molecule. Heavier molecules move slower and dissolve differently."],
              ["SMILES", "A text code that describes the structure. Each letter is an atom, and symbols like = mean double bonds."],
              ["XLogP", "Measures if the compound likes fat (high = fat-soluble) or water (low = water-soluble). Important for how drugs move in the body."],
              ["H-Bond Donor/Acceptor", "How many hydrogen bonds the molecule can form. Affects solubility and drug activity."],
              ["TPSA", "Surface area available for water interaction. Below 140 Å² usually means better absorption in the body."],
              ["InChIKey", "A unique fingerprint for the molecule — no two different compounds share the same InChIKey."],
              ["3D Structure", "Shows the real shape of the molecule in space. Different colors = different atoms. Rotate and zoom to explore!"],
            ].map(([k,v]) => (
              <div key={k} className="guide-item">
                <div className="guide-key">{k}</div>
                <div className="guide-val">{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}