import React, { useState } from "react";

export default function CompoundCard({ compound, isBest, index, onStructure, onSummary, onSimilar, onDescription }) {
  const {
    cid, name, formula, weight, image2D,
    has2D, has3D, hasCrystal, synonyms,
    xlogp, hbondDonor, hbondAcceptor, tpsa,
    smiles, inchikey, inchi, exactMass,
    rotatableBonds, description, createDate
  } = compound;

  const [showMore, setShowMore] = useState(false);
  const [showDownload, setShowDownload] = useState(null);
  const [displayContent, setDisplayContent] = useState(null); // for inline display

  const getDisplayUrl = (type, format) =>
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/${format}?record_type=${type}&response_type=display`;

  const downloadLinks = (type) => [
    { label: "SDF", save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/SDF?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`, format: "SDF", type },
    { label: "JSON", save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/JSON?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`, format: "JSON", type },
    { label: "XML", save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/XML?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`, format: "XML", type },
    { label: "ASNT", save: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/CID/${cid}/record/ASNT?record_type=${type}&response_type=save&response_basename=Structure_${type}_CID_${cid}`, format: "ASNT", type },
  ];

  return (
    <div className={`compound-card ${isBest ? "best-card" : ""}`}>
      {index && <div className="card-index">{index} of results</div>}

      <div className="card-top-row">
        <div className="card-img-wrap" onContextMenu={e => e.preventDefault()}>
          <img src={image2D} alt={name} draggable="false" onContextMenu={e => e.preventDefault()} />
        </div>

        <div className="card-top-info">
          {synonyms?.length > 0 && (
            <div className="synonym-line">{synonyms.join("; ")}</div>
          )}

          <table className="info-table">
            <tbody>
              <tr><td className="info-key">Compound CID</td><td className="info-val cid-val">{cid}</td></tr>
              <tr><td className="info-key">MF</td><td className="info-val formula-val">{formula}</td></tr>
              <tr><td className="info-key">MW</td><td className="info-val">{weight} g/mol</td></tr>
              <tr><td className="info-key">IUPAC Name</td><td className="info-val">{name}</td></tr>
              <tr><td className="info-key">SMILES</td><td className="info-val smiles-val">{smiles && smiles !== "N/A" ? smiles : "—"}</td></tr>
              <tr><td className="info-key">InChIKey</td><td className="info-val inchi-val">{inchikey}</td></tr>
              {inchi && <tr><td className="info-key">InChI</td><td className="info-val inchi-val">{inchi}</td></tr>}
              {createDate && <tr><td className="info-key">Create Date</td><td className="info-val">{createDate}</td></tr>}
            </tbody>
          </table>

          {description && (
            <div className="card-description">
              <div className="desc-text" style={{maxHeight: showMore ? "none" : "3.5rem", overflow:"hidden", position:"relative"}}>
                {description}
                {!showMore && <div className="desc-fade" />}
              </div>
              <button className="btn-viewmore" onClick={() => setShowMore(!showMore)}>
                {showMore ? "View Less" : "View More..."}
              </button>
            </div>
          )}

          {showMore && (
            <table className="info-table" style={{marginTop:"0.5rem"}}>
              <tbody>
                <tr><td className="info-key">XLogP</td><td className="info-val">{xlogp}</td></tr>
                <tr><td className="info-key">H-Bond Donor</td><td className="info-val">{hbondDonor}</td></tr>
                <tr><td className="info-key">H-Bond Acceptor</td><td className="info-val">{hbondAcceptor}</td></tr>
                <tr><td className="info-key">Rotatable Bonds</td><td className="info-val">{rotatableBonds}</td></tr>
                <tr><td className="info-key">Exact Mass</td><td className="info-val">{exactMass}</td></tr>
                <tr><td className="info-key">TPSA</td><td className="info-val">{tpsa} Å²</td></tr>
              </tbody>
            </table>
          )}

          {/* action links — all inside app */}
          <div className="card-links">
            <button className="link-btn" onClick={onSummary}>Summary</button>
            <span className="link-sep">|</span>
            <button className="link-btn" onClick={onDescription}>Description</button>
            <span className="link-sep">|</span>
            <button className="link-btn" onClick={onSimilar}>Similar Structures</button>
            <span className="link-sep">|</span>
            <button className="link-btn" onClick={() => setShowMore(!showMore)}>Related Records</button>
          </div>

          <div className="struct-row">
            <span className="struct-label">View Structure:</span>
            {has2D && <button className="btn-struct" onClick={() => onStructure("2d")}>2D</button>}
            {has3D && <button className="btn-struct" onClick={() => onStructure("3d")}>3D</button>}
            {hasCrystal && <button className="btn-struct" onClick={() => onStructure("crystal")}>Crystal</button>}
          </div>

          <div className="download-section">
            <span className="struct-label">Download:</span>
            <button className={`btn-struct ${showDownload==="2d"?"active":""}`} onClick={() => { setShowDownload(showDownload==="2d"?null:"2d"); setDisplayContent(null); }}>2D</button>
            <button className={`btn-struct ${showDownload==="3d"?"active":""}`} onClick={() => { setShowDownload(showDownload==="3d"?null:"3d"); setDisplayContent(null); }}>3D</button>
          </div>

          {showDownload && (
            <div className="download-table">
              {downloadLinks(showDownload).map(dl => (
                <div key={dl.label} className="download-row">
                  <span className="download-label">{dl.label}</span>
                  <a href={dl.save} target="_blank" rel="noreferrer" className="download-btn">⬇ Save</a>
                  <button
                    className="download-btn"
                    onClick={() => setDisplayContent({ url: getDisplayUrl(dl.type, dl.label), label: dl.label })}
                  >👁 Display</button>
                </div>
              ))}
            </div>
          )}

          {/* Inline display viewer */}
          {displayContent && (
            <div className="display-viewer">
              <div className="display-viewer-head">
                <span>{displayContent.label} Data — CID {cid}</span>
                <button onClick={() => setDisplayContent(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--danger)",fontSize:"1rem"}}>✕</button>
              </div>
              <iframe
                src={displayContent.url}
                title="Display content"
                width="100%"
                height="300px"
                style={{border:"none",display:"block",background:"#fff"}}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}