import React, { useState } from "react";
import { Mail, Phone, User, Building2, Briefcase, MessageSquare, Send, CheckCircle } from "lucide-react";

const SUPPORT_EMAIL = "customersupport@spatialbiologics.com";

export default function ContactSection() {
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
      setError("Please fill in Name, Email, and Message.");
      return;
    }
    setError("");
    setLoading(true);

    // Try EmailJS-style fetch if backend not configured;
    // fallback: open mailto so the query always reaches the support address.
    try {
      // Attempt POST to backend route if available
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, to: SUPPORT_EMAIL }),
      });
      if (!res.ok) throw new Error("backend unavailable");
      setSent(true);
    } catch {
      // Fallback: open user's mail client pre-filled
      const subject = encodeURIComponent(
        `Query from ${form.name} – Spatial Biologics`
      );
      const body = encodeURIComponent(
        `Name: ${form.name}\n` +
        `Affiliation: ${form.affiliation}\n` +
        `Designation: ${form.designation}\n` +
        `Phone: ${form.phone}\n` +
        `Email: ${form.email}\n\n` +
        `Message:\n${form.message}`
      );
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 70%,#3b82f6 100%)",
      padding: "32px 0 0",
    }}>
      {/* Heading */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0 }}>
          Contact &amp; Support
        </h2>
        <p style={{ color: "#bfdbfe", fontSize: 14, marginTop: 6 }}>
          Have a question? Our team responds within 24 hours.
        </p>
      </div>

      {sent ? (
        <div style={{
          maxWidth: 500, margin: "0 auto 32px", background: "rgba(255,255,255,0.12)",
          borderRadius: 14, padding: "32px 24px", textAlign: "center",
        }}>
          <CheckCircle size={40} color="#86efac" style={{ marginBottom: 12 }} />
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>Message sent!</p>
          <p style={{ color: "#bfdbfe", fontSize: 13, marginTop: 6 }}>
            We'll get back to you at <strong>{form.email}</strong>.
          </p>
          <button
            onClick={() => { setSent(false); setForm({ name: "", affiliation: "", designation: "", phone: "", email: "", message: "" }); }}
            style={{ marginTop: 18, padding: "8px 20px", background: "#fff", color: "#1e3a8a", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            Send another
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: 800, margin: "0 auto 0",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "16px 16px 0 0",
            border: "1px solid rgba(255,255,255,0.15)",
            borderBottom: "none",
            padding: "28px 32px 32px",
            backdropFilter: "blur(6px)",
          }}
        >
          {error && (
            <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "8px 14px", fontSize: 13, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <ContactField icon={User} label="Full Name *" placeholder="Dr. Jane Smith"
              value={form.name} onChange={set("name")} required />
            <ContactField icon={Building2} label="Affiliation" placeholder="University / Institute"
              value={form.affiliation} onChange={set("affiliation")} />
            <ContactField icon={Briefcase} label="Designation" placeholder="Professor / Researcher"
              value={form.designation} onChange={set("designation")} />
            <ContactField icon={Phone} label="Phone Number" placeholder="+91 98765 43210" type="tel"
              value={form.phone} onChange={set("phone")} />
            <div style={{ gridColumn: "1 / -1" }}>
              <ContactField icon={Mail} label="Email Address *" placeholder="you@example.com" type="email"
                value={form.email} onChange={set("email")} required />
            </div>
          </div>

          {/* Message box */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#bfdbfe", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              <MessageSquare size={13} /> Query / Message *
            </label>
            <textarea
              required rows={4}
              placeholder="Describe your question or request in detail…"
              value={form.message}
              onChange={set("message")}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 13, outline: "none", resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
            {/* Inline placeholder fix for dark bg */}
            <style>{`textarea::placeholder{color:rgba(255,255,255,0.4)}`}</style>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              Queries sent to: <span style={{ color: "#93c5fd" }}>{SUPPORT_EMAIL}</span>
            </p>
            <button
              type="submit" disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 28px", background: loading ? "rgba(255,255,255,0.3)" : "#fff",
                color: "#1e3a8a", border: "none", borderRadius: 10, fontWeight: 700,
                fontSize: 14, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
              }}
            >
              <Send size={15} />
              {loading ? "Sending…" : "Send Message"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ContactField({ icon: Icon, label, placeholder, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#bfdbfe", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        <Icon size={13} /> {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={{
          width: "100%", padding: "9px 12px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)",
          color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
        }}
      />
      <style>{`input::placeholder{color:rgba(255,255,255,0.4)!important}`}</style>
    </div>
  );
}
