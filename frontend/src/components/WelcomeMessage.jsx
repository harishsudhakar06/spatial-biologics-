import React, { useEffect, useState, useRef } from "react";
import { Dna } from "lucide-react";

export default function WelcomeMessage({ username, onDone }) {
  const [phase, setPhase] = useState("in");
  const barRef = useRef(null);

  useEffect(() => {
    // Animate the progress bar width smoothly
    if (barRef.current) {
      setTimeout(() => { 
        barRef.current.style.width = "100%"; 
      }, 50);
    }
    // Transition to exit animation
    const t1 = setTimeout(() => setPhase("out"), 2600);
    // Callback to close the splash screen
    const t2 = setTimeout(() => onDone && onDone(), 3100);
    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
    };
  }, [onDone]);

  const name = username || "Researcher";

  return (
    <>
      <style>{`
        /* Premium entry & exit easing curves */
        @keyframes wFadeIn  { 
          from { opacity: 0; transform: scale(0.96) translateY(10px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }
        @keyframes wFadeOut { 
          from { opacity: 1; transform: scale(1); filter: blur(0px); } 
          to { opacity: 0; transform: scale(1.05); filter: blur(8px); } 
        }
        @keyframes wUp { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        /* Organic, shifting background glow spots */
        @keyframes floatBg1 { 
          0%, 100% { transform: translate(0px, 0px) scale(1); } 
          50% { transform: translate(30px, -30px) scale(1.15); } 
        }
        @keyframes floatBg2 { 
          0%, 100% { transform: translate(0px, 0px) scale(1.1); } 
          50% { transform: translate(-40px, 40px) scale(0.9); } 
        }

        /* 3D molecular orbit spins */
        @keyframes orbitSpin1 {
          0% { transform: rotateX(55deg) rotateY(20deg) rotateZ(0deg); }
          100% { transform: rotateX(55deg) rotateY(20deg) rotateZ(360deg); }
        }
        @keyframes orbitSpin2 {
          0% { transform: rotateX(55deg) rotateY(-20deg) rotateZ(360deg); }
          100% { transform: rotateX(55deg) rotateY(-20deg) rotateZ(0deg); }
        }

        /* Smooth nucleus pulsing */
        @keyframes nucleusPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(13, 148, 136, 0.4); }
          50% { transform: scale(1.1); box-shadow: 0 0 50px rgba(13, 148, 136, 0.65); }
        }

        /* Progress bar shimmer pulse */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .w-in  { animation: wFadeIn  0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .w-out { animation: wFadeOut 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .w-up  { animation: wUp      0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
        
        .orbit-container {
          perspective: 1000px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orbit-ring {
          position: absolute;
          width: 96px;
          height: 96px;
          border: 1.5px solid rgba(13, 148, 136, 0.2);
          border-radius: 50%;
          transform-style: preserve-3d;
        }

        .orbit-ring-1 {
          animation: orbitSpin1 4s linear infinite;
        }

        .orbit-ring-2 {
          animation: orbitSpin2 5.5s linear infinite;
          border-color: rgba(2, 132, 199, 0.15);
        }

        .orbit-dot {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #0d9488;
          border: 2px solid #fff;
          box-shadow: 0 0 10px #0d9488;
          top: 0;
          left: 50%;
          margin-left: -5px;
          margin-top: -5px;
        }

        .orbit-dot-2 {
          background: #0284c7;
          box-shadow: 0 0 10px #0284c7;
          bottom: 0;
          top: auto;
        }
      `}</style>
      
      <div
        className={phase === "out" ? "w-out" : "w-in"}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "radial-gradient(circle at center, #f4faf8 0%, #ffffff 80%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "40px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Soft, floating organically moving glow spots */}
        <div style={{
          position: "absolute",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,148,136,0.06) 0%, transparent 70%)",
          top: "10%",
          left: "10%",
          animation: "floatBg1 8s ease-in-out infinite",
          pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2,132,199,0.05) 0%, transparent 70%)",
          bottom: "10%",
          right: "10%",
          animation: "floatBg2 9s ease-in-out infinite 1s",
          pointerEvents: "none"
        }} />

        {/* Central 3D Orbit Molecular Graphic */}
        <div className="orbit-container" style={{ position: "relative", width: "120px", height: "120px" }}>
          {/* Inner Glowing Nucleus */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
            animation: "nucleusPulse 2.5s ease-in-out infinite",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 15,
            boxShadow: "0 4px 15px rgba(15, 118, 110, 0.3)"
          }}>
            <Dna size={18} className="animate-pulse" />
          </div>

          {/* Overlapping Orbiting Rings */}
          <div className="orbit-ring orbit-ring-1">
            <div className="orbit-dot" />
          </div>
          <div className="orbit-ring orbit-ring-2">
            <div className="orbit-dot orbit-dot-2" />
          </div>
        </div>

        {/* Text Section */}
        <div className="w-up text-center z-10 space-y-4">
          <div style={{
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#0f766e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontFamily: "'Poppins', sans-serif"
          }}>
            <span className="animate-pulse">🧪</span> SPATIAL BIOLOGICS · CHEMVAULT
          </div>
          
          <div className="space-y-1.5">
            <div style={{
              fontSize: "clamp(22px, 5vw, 30px)",
              fontWeight: "600",
              color: "#475569",
              fontFamily: "'Poppins', sans-serif",
              letterSpacing: "-0.5px",
              lineHeight: 1.2,
            }}>
              Welcome back,
            </div>
            <div style={{
              fontSize: "clamp(28px, 7vw, 42px)",
              fontWeight: "800",
              background: "linear-gradient(90deg, #0f766e 0%, #0d9488 50%, #0284c7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-1.5px",
              fontFamily: "'Poppins', sans-serif",
              textTransform: "capitalize",
              lineHeight: 1.1
            }}>
              {name}
            </div>
          </div>

          <div style={{
            fontSize: "13px",
            color: "#64748b",
            letterSpacing: "0.01em",
            fontWeight: "500"
          }}>
            Initializing secure bioinformatics workspace...
          </div>
        </div>

        {/* Sleek Progress bar with glowing shimmer */}
        <div style={{
          width: "180px",
          height: "5px",
          background: "#e2e8f0",
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid rgba(15, 118, 110, 0.05)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
          zIndex: 10
        }}>
          <div 
            ref={barRef} 
            style={{
              height: "100%",
              width: "0%",
              background: "linear-gradient(90deg, #0f766e, #0d9488, #0284c7)",
              backgroundSize: "200% 100%",
              borderRadius: "999px",
              transition: "width 2.5s cubic-bezier(0.1, 0.8, 0.3, 1)",
              animation: "shimmer 1.5s linear infinite"
            }} 
          />
        </div>
      </div>
    </>
  );
}
