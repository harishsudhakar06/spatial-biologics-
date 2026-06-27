import React, { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

const SAVED_KEY = "chemvault_saved_creds";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY));
      if (saved?.email && saved?.password) {
        setEmail(saved.email);
        setPassword(saved.password);
        setRemember(true);
      }
    } catch {}
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api.post("/login", { email, password });
      if (remember) {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(SAVED_KEY);
      }
      setUser(r.data.user);
      nav("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
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
          Explore molecular structures, chemical data, and compound properties — all in one secure place.
        </p>
        <div className="auth-features">
          <div className="auth-feature">✅ Search by name or CID</div>
          <div className="auth-feature">✅ 2D, 3D and Crystal structures</div>
          <div className="auth-feature">✅ Download in SDF, JSON, XML</div>
          <div className="auth-feature">✅ Powered by Chemvault</div>
        </div>
        <svg className="auth-atoms" viewBox="0 0 500 500" fill="none">
          <circle cx="250" cy="250" r="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          <circle cx="250" cy="250" r="170" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="6 4"/>
          <circle cx="250" cy="150" r="8" fill="rgba(255,255,255,0.3)"/>
          <circle cx="350" cy="300" r="6" fill="rgba(255,255,255,0.25)"/>
          <circle cx="150" cy="320" r="5" fill="rgba(255,255,255,0.2)"/>
          <line x1="250" y1="150" x2="350" y2="300" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <line x1="350" y1="300" x2="150" y2="320" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          <line x1="150" y1="320" x2="250" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        </svg>
      </div>
      <div className="auth-right">
        <div className="auth-box">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to your ChemVault account</p>
          {error && <div className="err-msg">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div style={{display:"flex",alignItems:"justify",gap:"0.5rem",marginBottom:"0.8rem"}}>
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{width:"auto",cursor:"pointer"}}
              />
              <label
                htmlFor="remember"
                style={{fontSize:"0.8rem",color:"var(--muted)",cursor:"pointer",textTransform:"none",letterSpacing:"normal",marginBottom:0}}
              >
                Remember my credentials
              </label>
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <div className="auth-switch">
            No account? <a onClick={() => nav("/register")}>Create one</a>
          </div>
        </div>
      </div>
    </div>
  );
} 