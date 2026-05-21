import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await axios.post(`${API}/register`, form);
      setSuccess("Registered! Redirecting to login…");
      setTimeout(() => nav("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div className="auth-brand">ChemVault</div>
        <p className="auth-tagline">Join ChemVault and explore thousands of chemical compounds with rich structural data.</p>
        <svg className="auth-atoms" viewBox="0 0 500 500" fill="none">
          <circle cx="250" cy="250" r="120" stroke="rgba(123,92,255,0.08)" strokeWidth="1"/>
          <circle cx="250" cy="250" r="200" stroke="rgba(0,212,255,0.05)" strokeWidth="1" strokeDasharray="8 5"/>
          <circle cx="250" cy="130" r="9" fill="rgba(123,92,255,0.5)"/>
          <circle cx="370" cy="310" r="7" fill="rgba(0,212,255,0.4)"/>
          <circle cx="130" cy="310" r="6" fill="rgba(0,229,160,0.4)"/>
        </svg>
      </div>
      <div className="auth-right">
        <div className="auth-box">
          <h2>Create account</h2>
          <p className="sub">Start exploring chemical data today</p>
          {error && <div className="err-msg">{error}</div>}
          {success && <div className="err-msg" style={{background:"rgba(0,229,160,0.1)",borderColor:"rgba(0,229,160,0.3)",color:"var(--success)"}}>{success}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Your Name" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="Min 6 characters" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} minLength={6} required />
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