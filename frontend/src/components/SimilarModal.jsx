import React, { useEffect, useState } from "react";
import api from "../api";

export default function SimilarModal({ cid, onClose, onStructure }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/similar/${cid}`)
      .then(r => setResults(r.data.results))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [cid]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:"700px"}}>
        <div className="modal-head">
          <h3>Similar Structures — CID {cid}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading && <p className="modal-info-text">Searching similar structures...</p>}
          {!loading && results.length === 0 && (
            <p className="modal-info-text">No similar structures found.</p>
          )}
          {results.map(r => (
            <div key={r.cid} style={{display:"flex",gap:"1rem",alignItems:"center",padding:"0.8rem 0",borderBottom:"1px solid var(--border2)"}}>
              <div className="card-img-wrap" style={{width:"80px",height:"80px",minWidth:"80px"}}>
                <img
                  src={r.image2D}
                  alt={r.name}
                  draggable="false"
                  onContextMenu={e => e.preventDefault()}
                />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.75rem",color:"var(--accent)",fontWeight:600,marginBottom:"0.2rem"}}>CID {r.cid}</div>
                <div style={{fontSize:"0.78rem",color:"var(--text)",marginBottom:"0.2rem",wordBreak:"break-word"}}>{r.name}</div>
                <div style={{fontSize:"0.74rem",color:"var(--muted)"}}>{r.formula} | {r.weight} g/mol</div>
                <div style={{fontSize:"0.7rem",color:"#888",marginTop:"0.1rem"}}>{r.inchikey}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                <button className="btn-struct" onClick={() => onStructure(r.cid, "2d")}>2D</button>
                <button className="btn-struct" onClick={() => onStructure(r.cid, "3d")}>3D</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}