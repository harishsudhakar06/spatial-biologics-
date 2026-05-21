import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function SummaryModal({ cid, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/summary/${cid}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cid]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:"750px", maxHeight:"90vh"}}>
        <div className="modal-head">
          <h3>Summary — CID {cid}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading && <p className="modal-info-text">Loading...</p>}
          {data && (
            <>
              <div style={{display:"flex",gap:"1rem",marginBottom:"1rem",alignItems:"flex-start"}}>
                <div className="card-img-wrap" style={{width:"140px",height:"140px",minWidth:"140px"}}>
                  <img src={data.image2D} alt={data.name} draggable="false" onContextMenu={e=>e.preventDefault()} />
                </div>
                <div style={{flex:1}}>
                  {data.synonyms?.length > 0 && (
                    <div className="synonym-line" style={{marginBottom:"0.5rem"}}>{data.synonyms.join("; ")}</div>
                  )}
                  <table className="info-table">
                    <tbody>
                      <tr><td className="info-key">Compound CID</td><td className="info-val cid-val">{data.cid}</td></tr>
                      <tr><td className="info-key">MF</td><td className="info-val formula-val">{data.formula}</td></tr>
                      <tr><td className="info-key">MW</td><td className="info-val">{data.weight} g/mol</td></tr>
                      <tr><td className="info-key">IUPAC Name</td><td className="info-val">{data.name}</td></tr>
                      <tr><td className="info-key">SMILES</td><td className="info-val smiles-val">{data.smiles}</td></tr>
                      <tr><td className="info-key">InChIKey</td><td className="info-val inchi-val">{data.inchikey}</td></tr>
                      {data.inchi && <tr><td className="info-key">InChI</td><td className="info-val inchi-val">{data.inchi}</td></tr>}
                      {data.createDate && <tr><td className="info-key">Create Date</td><td className="info-val">{data.createDate}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <table className="info-table" style={{marginBottom:"1rem"}}>
                <tbody>
                  <tr><td className="info-key">XLogP</td><td className="info-val">{data.xlogp}</td></tr>
                  <tr><td className="info-key">H-Bond Donor</td><td className="info-val">{data.hbondDonor}</td></tr>
                  <tr><td className="info-key">H-Bond Acceptor</td><td className="info-val">{data.hbondAcceptor}</td></tr>
                  <tr><td className="info-key">Rotatable Bonds</td><td className="info-val">{data.rotatableBonds}</td></tr>
                  <tr><td className="info-key">Exact Mass</td><td className="info-val">{data.exactMass}</td></tr>
                  <tr><td className="info-key">TPSA</td><td className="info-val">{data.tpsa} Å²</td></tr>
                </tbody>
              </table>

              {data.allDescriptions?.length > 0 && (
                <div style={{marginTop:"1rem"}}>
                  <div className="desc-section-title" style={{fontSize:"0.85rem",marginBottom:"0.6rem"}}>🔬 Description</div>
                  {data.allDescriptions.map((d,i) => (
                    <div key={i} className="desc-entry">
                      <p style={{fontSize:"0.78rem",color:"#444",lineHeight:"1.6"}}>{d.text}</p>
                      {d.source && <div className="desc-source">{d.source}</div>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}