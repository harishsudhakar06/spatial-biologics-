import React, { useEffect, useState } from "react";
import api from "../api";

export default function StructureModal({ cid, type, name, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    api.get(`/structure/${cid}/${type}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || "Failed to load"))
      .finally(() => setLoading(false));
  }, [cid, type]);

  const badgeClass = { "2d": "badge-2d", "3d": "badge-3d", crystal: "badge-crystal" }[type];
  const badgeLabel = { "2d": "2D Structure", "3d": "3D Conformer", crystal: "Crystal View" }[type];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{maxWidth:"700px"}}>
        <div className="modal-head">
          <div>
            <span className={`modal-badge ${badgeClass}`}>{badgeLabel}</span>
            <h3 style={{marginTop:"0.3rem"}}>{name}</h3>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading && <p className="modal-info-text">Loading structure...</p>}
          {error && <p className="modal-info-text" style={{color:"var(--danger)"}}>{error}</p>}

          {data && data.type === "2d" && (
            <div>
              <div className="struct-toolbar">
                <button className="tool-btn" onClick={() => setZoom(z => Math.min(z+0.25, 4))}>🔍 Zoom In</button>
                <button className="tool-btn" onClick={() => setZoom(z => Math.max(z-0.25, 0.3))}>🔎 Zoom Out</button>
                <button className="tool-btn" onClick={() => setZoom(1)}>↺ Reset</button>
                <span className="tool-label">Zoom: {Math.round(zoom*100)}%</span>
              </div>
              <div className="struct-viewer-2d">
                <div style={{transform:`scale(${zoom})`, transition:"transform 0.2s", transformOrigin:"center center"}}>
                  <img
                    src={data.imageUrl}
                    alt="2D Structure"
                    draggable="false"
                    onContextMenu={e => e.preventDefault()}
                    style={{maxWidth:"460px", maxHeight:"460px", display:"block", margin:"0 auto"}}
                  />
                </div>
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> A 2D structure shows atoms and bonds in a flat diagram. Lines = bonds, letters = atoms (C=Carbon, O=Oxygen, N=Nitrogen, H=Hydrogen).
              </div>
            </div>
          )}

          {data && data.type === "3d" && (
            <div>
              <div className="struct-toolbar">
                <span className="tool-label">🖱️ Drag to rotate &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp; Right-click to pan</span>
              </div>
              <div className="modal-embed-wrap">
                <iframe
                  src={data.embedUrl}
                  title="3D Structure"
                  width="100%"
                  height="420px"
                  style={{border:"none", display:"block"}}
                />
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> 3D view shows the actual shape of the molecule. Colors: grey=Carbon, red=Oxygen, blue=Nitrogen, white=Hydrogen. Drag to rotate, scroll to zoom!
              </div>
            </div>
          )}

          {data && data.type === "crystal" && (
            <div>
              <div className="struct-toolbar">
                <span className="tool-label">🖱️ Drag to rotate &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp; Right-click to pan</span>
              </div>
              <div className="modal-embed-wrap">
                <iframe
                  src={data.embedUrl}
                  title="Crystal Structure"
                  width="100%"
                  height="420px"
                  style={{border:"none", display:"block"}}
                />
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> Crystal wireframe shows how molecules pack in a repeating 3D pattern. Only bonds (lines) are shown to make the overall shape easier to see.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}