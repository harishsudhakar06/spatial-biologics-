import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/register", form);
      setSuccess("Registered! Redirecting to login…");
      setTimeout(() => nav("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-brand">ChemVault</div>
        <div className="auth-brand-sub">Chemical Compound Database</div>
        <p className="auth-tagline">
          Join ChemVault and explore thousands of chemical compounds with rich structural data.
        </p>
        <div className="auth-features">
          <div className="auth-feature">✅ Search by name or CID</div>
          <div className="auth-feature">✅ 2D, 3D and Crystal structures</div>
          <div className="auth-feature">✅ Download in SDF, JSON, XML</div>
          <div className="auth-feature">✅ Integrated chemical databases</div>
        </div>
        <svg className="auth-atoms" viewBox="0 0 500 500" fill="none">
          <circle cx="250" cy="250" r="120" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          <circle cx="250" cy="250" r="200" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="8 5"/>
          <circle cx="250" cy="130" r="9" fill="rgba(255,255,255,0.3)"/>
          <circle cx="370" cy="310" r="7" fill="rgba(255,255,255,0.25)"/>
          <circle cx="130" cy="310" r="6" fill="rgba(255,255,255,0.2)"/>
          <line x1="250" y1="130" x2="370" y2="310" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <line x1="370" y1="310" x2="130" y2="310" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <line x1="130" y1="310" x2="250" y2="130" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        </svg>
      </div>
      <div className="auth-right">
        <div className="auth-box">
          <h2>Create account</h2>
          <p className="sub">Start exploring chemical data today</p>
          {error && <div className="err-msg">{error}</div>}
          {success && (
            <div className="err-msg" style={{background:"#f0fdf4",borderColor:"#86efac",color:"#166534"}}>
              {success}
            </div>
          )}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Your Name"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                minLength={6}
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Account"}
            </button>
          </form>
          <div className="auth-switch">
            Already have one? <a onClick={() => nav("/login")}>Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}