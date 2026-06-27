import React, { useState, useEffect } from "react";
import { X, FlaskConical, Eye, EyeOff, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function AuthModal({ initialMode = "login", onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { login, register, sendForgotPasswordOTP, verifyOTPAndResetPassword } = useAuth();
  const { setActiveModule } = useWorkspace();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({
    name: "", email: "", phone: "",
    designation: "", affiliation: "",
    password: "", confirmPassword: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState("request");
  const [forgotTimer, setForgotTimer] = useState(0);
  const [canResendForgotOtp, setCanResendForgotOtp] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  const switchMode = (m) => { setMode(m); setError(""); setSuccess(""); setForgotStep("request"); setForgotTimer(0); setCanResendForgotOtp(false); };

  useEffect(() => {
    if (forgotTimer > 0) {
      const interval = setInterval(() => setForgotTimer((value) => value - 1), 1000);
      return () => clearInterval(interval);
    }
    if (forgotTimer === 0 && forgotStep === "verify") {
      setCanResendForgotOtp(true);
    }
  }, [forgotTimer, forgotStep]);

  const handleLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setActiveModule("ligand"); onClose();
    } catch (err) { setError(err.response?.data?.error || "Invalid email or password."); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError("");
    if (regForm.password !== regForm.confirmPassword) { setError("Passwords do not match."); return; }
    if (regForm.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await register(regForm.name, regForm.email, regForm.password, regForm.phone, regForm.designation, regForm.affiliation);
      setSuccess("Account created! Please sign in.");
      setTimeout(() => switchMode("login"), 1800);
    } catch (err) { setError(err.response?.data?.error || "Registration failed."); }
    finally { setLoading(false); }
  };

  const sendForgotOtp = async (e) => {
    e.preventDefault(); setError("");
    if (!forgotEmail) { setError("Please enter your email."); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError("Passwords do not match."); return; }
    if (forgotNewPassword.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const data = await sendForgotPasswordOTP(forgotEmail);
      setSuccess(data?.message || "OTP sent. Please check your phone or email.");
      setForgotStep("verify");
      setForgotTimer(30);
      setCanResendForgotOtp(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyForgotOtp = async (e) => {
    e.preventDefault(); setError("");
    if (!forgotOtp || forgotOtp.length < 4) { setError("Enter a valid OTP."); return; }
    setLoading(true);
    try {
      await verifyOTPAndResetPassword(forgotEmail, forgotOtp, forgotNewPassword);
      setSuccess("Password updated! Please sign in.");
      setTimeout(() => switchMode("login"), 1800);
    } catch (err) {
      setError(err.response?.data?.error || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    if (!forgotEmail) { setError("Please enter your email."); return; }
    setError("");
    setLoading(true);
    try {
      const data = await sendForgotPasswordOTP(forgotEmail);
      setSuccess(data?.message || "OTP resent. Please check your phone or email.");
      setForgotTimer(30);
      setCanResendForgotOtp(false);
      setForgotOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(15,23,42,0.55)", backdropFilter:"blur(2px)", display:"flex", alignItems:"flex-start", justifyContent:"flex-end", padding:"56px 16px 0 0" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", borderRadius:16, width: 460, boxShadow:"0 20px 60px rgba(0,0,0,0.18)", overflow:"hidden", animation:"slideDown 0.2s ease", maxHeight:"calc(100vh - 72px)", overflowY:"auto", transition:"width 0.2s" }}>
        <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"20px 24px 16px", position:"sticky", top:0, zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <FlaskConical size={18} color="#bfdbfe" />
              <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Spatial Biologics</span>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:6, padding:"4px 6px", cursor:"pointer", color:"#fff" }}>
              <X size={14} />
            </button>
          </div>
          {mode !== "forgot" && (
            <div style={{ display:"flex", gap:4, marginTop:14 }}>
              {["login","register"].map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{ flex:1, padding:"6px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background: mode===m ? "#fff" : "rgba(255,255,255,0.12)", color: mode===m ? "#1e3a8a" : "rgba(255,255,255,0.8)", transition:"all 0.15s" }}>
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}
          {mode === "forgot" && <p style={{ color:"#bfdbfe", fontSize:13, marginTop:10 }}>Reset your password</p>}
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px 24px" }}>
          {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:14 }}>{error}</div>}
          {success && <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#166534", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:14 }}>{success}</div>}

          {/* SIGN IN */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <Field label="Email Address">
                <input type="email" required placeholder="you@example.com" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email:e.target.value})} style={inp} />
              </Field>
              <Field label="Password">
                <div style={{ position:"relative" }}>
                  <input type={showPass?"text":"password"} required placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password:e.target.value})} style={{...inp, paddingRight:36}} />
                  <EyeToggle show={showPass} toggle={() => setShowPass(p=>!p)} Eye={Eye} EyeOff={EyeOff} />
                </div>
              </Field>
              <div style={{ textAlign:"right", marginBottom:16, marginTop:-8 }}>
                <button type="button" onClick={() => switchMode("forgot")} style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, cursor:"pointer" }}>Forgot password?</button>
              </div>
              <Btn loading={loading} label="Sign In" />
            </form>
          )}

          {/* SIGN UP */}
          {mode === "register" && (
            <form onSubmit={handleRegister}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                <Field label="Full Name *">
                  <input type="text" required placeholder="Dr. Jane Smith" value={regForm.name} onChange={e => setRegForm({...regForm, name:e.target.value})} style={inp} />
                </Field>
                <Field label="Phone Number">
                  <input type="tel" placeholder="+91 98765 43210" value={regForm.phone} onChange={e => setRegForm({...regForm, phone:e.target.value})} style={inp} />
                </Field>
                <Field label="Designation">
                  <input type="text" placeholder="Professor / Researcher" value={regForm.designation} onChange={e => setRegForm({...regForm, designation:e.target.value})} style={inp} />
                </Field>
                <Field label="Affiliation">
                  <input type="text" placeholder="University / Institute" value={regForm.affiliation} onChange={e => setRegForm({...regForm, affiliation:e.target.value})} style={inp} />
                </Field>
              </div>
              <Field label="Email Address *">
                <input type="email" required placeholder="you@example.com" value={regForm.email} onChange={e => setRegForm({...regForm, email:e.target.value})} style={inp} />
              </Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                <Field label="Password *">
                  <div style={{ position:"relative" }}>
                    <input type={showPass?"text":"password"} required placeholder="Min. 6 chars" value={regForm.password} minLength={6} onChange={e => setRegForm({...regForm, password:e.target.value})} style={{...inp, paddingRight:36}} />
                    <EyeToggle show={showPass} toggle={() => setShowPass(p=>!p)} Eye={Eye} EyeOff={EyeOff} />
                  </div>
                </Field>
                <Field label="Confirm Password *">
                  <div style={{ position:"relative" }}>
                    <input type={showConfirm?"text":"password"} required placeholder="Repeat password" value={regForm.confirmPassword} onChange={e => setRegForm({...regForm, confirmPassword:e.target.value})} style={{...inp, paddingRight:36}} />
                    <EyeToggle show={showConfirm} toggle={() => setShowConfirm(p=>!p)} Eye={Eye} EyeOff={EyeOff} />
                  </div>
                </Field>
              </div>
              <Btn loading={loading} label="Create Account" />
            </form>
          )}

          {/* FORGOT */}
          {mode === "forgot" && (
            <form onSubmit={forgotStep === "request" ? sendForgotOtp : verifyForgotOtp}>
              <p style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>
                Enter your email, new password and confirm it. Then send OTP to verify.
              </p>
              <Field label="Email Address">
                <div style={{ position:"relative" }}>
                  <Mail size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }} />
                  <input type="email" required placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} style={{...inp, paddingLeft:32}} />
                </div>
              </Field>
              <Field label="New Password">
                <div style={{ position:"relative" }}>
                  <input type={showForgotPass ? "text" : "password"} required placeholder="••••••••" value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} style={{...inp, paddingRight:36}} minLength={6} />
                  <EyeToggle show={showForgotPass} toggle={() => setShowForgotPass(v => !v)} Eye={Eye} EyeOff={EyeOff} />
                </div>
              </Field>
              <Field label="Confirm Password">
                <div style={{ position:"relative" }}>
                  <input type={showForgotConfirm ? "text" : "password"} required placeholder="••••••••" value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)} style={{...inp, paddingRight:36}} minLength={6} />
                  <EyeToggle show={showForgotConfirm} toggle={() => setShowForgotConfirm(v => !v)} Eye={Eye} EyeOff={EyeOff} />
                </div>
              </Field>

              {forgotStep === "verify" && (
                <>
                  <Field label="OTP">
                    <input type="text" required placeholder="Enter OTP" value={forgotOtp} onChange={e => setForgotOtp(e.target.value)} style={inp} maxLength={6} />
                  </Field>
                  <div style={{ fontSize:12, color: forgotTimer > 0 ? "#2563eb" : "#f97316", marginBottom:10 }}>
                    {forgotTimer > 0 ? `OTP expires in ${forgotTimer}s` : "OTP expired. Resend to continue."}
                  </div>
                </>
              )}

              {forgotStep === "request" ? (
                <Btn loading={loading} label="Send OTP" />
              ) : (
                <>
                  <Btn loading={loading} label="Update Password" />
                  <button type="button" onClick={resendForgotOtp} disabled={loading || !canResendForgotOtp} style={{ width:"100%", marginTop:10, padding:"9px 0", borderRadius:8, border:"1px solid #d1d5db", background: canResendForgotOtp ? "#fff" : "#f8fafc", color: canResendForgotOtp ? "#2563eb" : "#94a3b8", cursor: canResendForgotOtp ? "pointer" : "not-allowed", fontSize:14 }}>
                    Resend OTP
                  </button>
                </>
              )}
              <div style={{ textAlign:"center", marginTop:12 }}>
                <button type="button" onClick={() => { switchMode("login"); setForgotStep("request"); setForgotOtp(""); setForgotNewPassword(""); setForgotConfirmPassword(""); setForgotTimer(0); }} style={{ background:"none", border:"none", color:"#2563eb", fontSize:12, cursor:"pointer" }}>← Back to Sign In</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

function EyeToggle({ show, toggle, Eye, EyeOff }) {
  return (
    <button type="button" onClick={toggle} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}>
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}

function Btn({ loading, label }) {
  return (
    <button type="submit" disabled={loading} style={{ width:"100%", padding:"9px 0", background: loading?"#93c5fd":"#2563eb", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor: loading?"not-allowed":"pointer", marginTop:4, transition:"background 0.15s" }}>
      {loading ? "Please wait…" : label}
    </button>
  );
}

const inp = { width:"100%", padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box", color:"#1e293b", background:"#fafafa" };
