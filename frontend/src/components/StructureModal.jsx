import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export default function StructureModal({ cid, type, name, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    axios.get(`${API}/structure/${cid}/${type}`)
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
              {/* Toolbar */}
              <div className="struct-toolbar">
                <button className="tool-btn" onClick={() => setZoom(z => Math.min(z + 0.2, 3))}>🔍 Zoom In</button>
                <button className="tool-btn" onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}>🔎 Zoom Out</button>
                <button className="tool-btn" onClick={() => setZoom(1)}>↺ Reset</button>
                <span className="tool-label">2D Structure — CID {cid}</span>
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
              {/* Info */}
              <div className="struct-info-box">
                <div className="struct-info-row"><span>Compound CID</span><span>{cid}</span></div>
                <div className="struct-info-row"><span>View Type</span><span>2D Structure (Flat)</span></div>
                <div className="struct-info-row"><span>Source</span><span>Chemical Database</span></div>
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> A 2D structure shows the arrangement of atoms and bonds in a flat diagram. Each line represents a chemical bond, and letters represent atoms (C=Carbon, O=Oxygen, N=Nitrogen, H=Hydrogen).
              </div>
            </div>
          )}

          {data && data.type === "3d" && (
            <div>
              <div className="struct-toolbar">
                <span className="tool-label">3D Conformer — CID {cid} | Click & drag to rotate</span>
              </div>
              <div className="modal-embed-wrap">
                <iframe
                  src={data.embedUrl}
                  title="3D Structure"
                  width="100%"
                  height="420px"
                  style={{border:"none", borderRadius:"0", display:"block"}}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              <div className="struct-info-box">
                <div className="struct-info-row"><span>Compound CID</span><span>{cid}</span></div>
                <div className="struct-info-row"><span>View Type</span><span>3D Conformer (Ball & Stick)</span></div>
                <div className="struct-info-row"><span>Controls</span><span>Drag to rotate • Scroll to zoom</span></div>
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> A 3D structure shows the actual shape of the molecule in space. Different colors represent different atoms — grey=Carbon, red=Oxygen, blue=Nitrogen, white=Hydrogen. You can rotate and zoom to explore it!
              </div>
            </div>
          )}

          {data && data.type === "crystal" && (
            <div>
              <div className="struct-toolbar">
                <span className="tool-label">Crystal Wireframe — CID {cid} | Click & drag to rotate</span>
              </div>
              <div className="modal-embed-wrap">
                <iframe
                  src={data.embedUrl}
                  title="Crystal Structure"
                  width="100%"
                  height="420px"
                  style={{border:"none", borderRadius:"0", display:"block"}}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              <div className="struct-info-box">
                <div className="struct-info-row"><span>Compound CID</span><span>{cid}</span></div>
                <div className="struct-info-row"><span>View Type</span><span>Crystal Wireframe</span></div>
                <div className="struct-info-row"><span>Controls</span><span>Drag to rotate • Scroll to zoom</span></div>
              </div>
              <div className="struct-student-note">
                💡 <strong>Student Note:</strong> A crystal structure shows how molecules arrange themselves in a repeating 3D pattern. This wireframe view shows only the bonds (lines) without filled atoms, making it easier to see the overall shape.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}