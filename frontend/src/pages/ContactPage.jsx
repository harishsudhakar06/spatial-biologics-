import React, { useState } from "react";
import {
  Mail, Phone, User, Building2, Briefcase,
  MessageSquare, Send, CheckCircle, ArrowLeft
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";

const SUPPORT_EMAIL = "customersupport@spatialbiologics.com";

export default function ContactPage() {
  const { setActiveModule } = useWorkspace();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "", affiliation: "", designation: "", phone: "", email: "", message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in Name, Email, and Message."); return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, to: SUPPORT_EMAIL }),
      });
      if (!res.ok) throw new Error("backend unavailable");
      setSent(true);
    } catch {
      // Fallback: open mail client pre-filled
      const subject = encodeURIComponent(`Query from ${form.name} – Spatial Biologics`);
      const body = encodeURIComponent(
        `Name: ${form.name}\nAffiliation: ${form.affiliation}\nDesignation: ${form.designation}\nPhone: ${form.phone}\nEmail: ${form.email}\n\nMessage:\n${form.message}`
      );
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      setSent(true);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      {/* Page header */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", padding: "28px 40px 32px" }}>
        <button
          onClick={() => setActiveModule(user ? "ligand" : "landing")}
          style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8, padding:"6px 14px", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:18 }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 style={{ color:"#fff", fontSize:26, fontWeight:800, margin:0 }}>Contact &amp; Support</h1>
        <p style={{ color:"#bfdbfe", fontSize:15, marginTop:6, marginBottom:0 }}>
          Have a question or collaboration request? Our team responds within 24 hours.
        </p>
      </div>

      <div style={{ maxWidth:820, margin:"0 auto", padding:"36px 24px 60px" }}>
        {sent ? (
          <div style={{ background:"var(--surface)", borderRadius:16, border:"1px solid var(--border)", padding:"48px 32px", textAlign:"center", boxShadow:"0 4px 24px rgba(37,99,235,0.07)" }}>
            <CheckCircle size={48} color="#14b8a6" style={{ marginBottom:16 }} />
            <h2 style={{ color:"var(--text-heading)", fontWeight:800, fontSize:20, marginBottom:8 }}>Message sent!</h2>
            <p style={{ color:"var(--text-muted)", fontSize:14 }}>
              We'll get back to you at <strong style={{ color:"var(--primary-blue)" }}>{form.email}</strong> soon.
            </p>
            <button
              onClick={() => { setSent(false); setForm({ name:"", affiliation:"", designation:"", phone:"", email:"", message:"" }); }}
              style={{ marginTop:24, padding:"10px 28px", background:"var(--primary-blue)", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer", fontSize:14 }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <div style={{ background:"var(--surface)", borderRadius:16, border:"1px solid var(--border)", padding:"36px 40px", boxShadow:"0 4px 24px rgba(37,99,235,0.07)" }}>
            <h2 style={{ color:"var(--text-heading)", fontWeight:800, fontSize:18, marginBottom:4 }}>Send us a message</h2>
            <p style={{ color:"var(--text-muted)", fontSize:13, marginBottom:28 }}>
              Queries are forwarded to <span style={{ color:"var(--primary-blue)", fontWeight:600 }}>{SUPPORT_EMAIL}</span>
            </p>

            {error && (
              <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"8px 14px", fontSize:13, marginBottom:20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Row 1 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                <CField icon={User} label="Full Name *" placeholder="Dr. Jane Smith" value={form.name} onChange={set("name")} required />
                <CField icon={Phone} label="Phone Number" placeholder="+91 98765 43210" type="tel" value={form.phone} onChange={set("phone")} />
              </div>
              {/* Row 2 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
                <CField icon={Briefcase} label="Designation" placeholder="Professor / Researcher / Student" value={form.designation} onChange={set("designation")} />
                <CField icon={Building2} label="Affiliation" placeholder="University / Institute / Company" value={form.affiliation} onChange={set("affiliation")} />
              </div>
              {/* Row 3 — full width email */}
              <CField icon={Mail} label="Email Address *" placeholder="you@example.com" type="email" value={form.email} onChange={set("email")} required />

              {/* Message */}
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"var(--text-body)", marginBottom:7 }}>
                  <MessageSquare size={14} color="var(--primary-blue)" /> Query / Message *
                </label>
                <textarea
                  required rows={5}
                  placeholder="Describe your question, request, or collaboration idea…"
                  value={form.message}
                  onChange={set("message")}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:"1px solid var(--border)", fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", color:"var(--text-body)", background:"var(--border2)" }}
                />
              </div>

              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <button type="submit" disabled={loading} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 32px", background: loading?"var(--border)":"var(--primary-blue)", color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor: loading?"not-allowed":"pointer", transition:"background 0.15s" }}>
                  <Send size={15} />
                  {loading ? "Sending…" : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Info cards */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginTop:28 }}>
          {[
            { icon:"📧", title:"Email Support", desc: SUPPORT_EMAIL },
            { icon:"⏱️", title:"Response Time", desc:"Within 24 hours on business days" },
            { icon:"🔬", title:"Research Queries", desc:"Collaborations & licensing welcome" },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 6px rgba(37,99,235,0.04)" }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
              <div style={{ fontWeight:700, fontSize:13, color:"var(--text-heading)", marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", wordBreak:"break-word" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CField({ icon: Icon, label, placeholder, value, onChange, type="text", required=false }) {
  return (
    <div style={{ marginBottom:20 }}>
      <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, color:"var(--text-body)", marginBottom:7 }}>
        <Icon size={14} color="var(--primary-blue)" /> {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={onChange} required={required}
        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"1px solid var(--border)", fontSize:13, outline:"none", boxSizing:"border-box", color:"var(--text-body)", background:"var(--border2)" }}
      />
    </div>
  );
}
