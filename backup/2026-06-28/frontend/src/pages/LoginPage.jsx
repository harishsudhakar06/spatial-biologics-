import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { FlaskConical, Eye, EyeOff, Mail, ShieldAlert } from "lucide-react";

export default function LoginPage({ initialMode = "login", embedded = false }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync mode when initialMode prop changes
  // (e.g. user clicks Sign Up in header after being on Sign In)
  useEffect(() => {
    setMode(initialMode);
    setError("");
    setSuccess("");
  }, [initialMode]);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register form
  const [regForm, setRegForm] = useState({
    name: "", email: "", phone: "",
    designation: "", affiliation: "",
    password: "", confirmPassword: "",
  });
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotStep, setForgotStep] = useState("request");
  const [forgotTimer, setForgotTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  const { login, register, sendForgotPasswordOTP, verifyOTPAndResetPassword } = useAuth();
  const { setActiveModule } = useWorkspace();

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setSuccess("");
    setForgotStep("request");
    setForgotTimer(0);
    setCanResend(false);
  };

  // OTP countdown
  useEffect(() => {
    if (forgotTimer <= 0) {
      if (forgotStep === "verify") setCanResend(true);
      return;
    }
    const t = setInterval(() => setForgotTimer(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [forgotTimer, forgotStep]);

  // ── Login ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setActiveModule("ligand");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (regForm.password !== regForm.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (regForm.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(
        regForm.name, regForm.email, regForm.password,
        regForm.phone, regForm.designation, regForm.affiliation
      );
      setSuccess("Account created! Please sign in.");
      setTimeout(() => switchMode("login"), 1800);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Send OTP ──
  const sendForgotOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!forgotEmail) { setError("Please enter your email."); return; }
    if (forgotNewPassword !== forgotConfirmPassword) { setError("Passwords do not match."); return; }
    if (forgotNewPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const data = await sendForgotPasswordOTP(forgotEmail);
      setSuccess(data?.message || "OTP sent to your email.");
      setForgotStep("verify");
      setForgotTimer(30);
      setCanResend(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Verify OTP ──
  const verifyForgotOtp = async (e) => {
    e.preventDefault();
    setError("");
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

  // ── Forgot: Resend OTP ──
  const resendForgotOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await sendForgotPasswordOTP(forgotEmail);
      setSuccess(data?.message || "OTP resent.");
      setForgotTimer(30);
      setCanResend(false);
      setForgotOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "w-full" : "w-full min-h-screen flex items-center justify-center py-12 px-4 relative bg-slate-50 dark:bg-[#0c1322]"}>
      {/* Back option in top-left corner */}
      {!embedded && (
        <button
          onClick={() => setActiveModule("landing")}
          className="absolute top-6 left-6 flex items-center gap-1.5 px-4 py-2 border border-teal-500/30 bg-teal-500/10 dark:bg-teal-500/5 text-teal-600 dark:text-teal-450 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm focus:outline-none"
        >
          ← Back to Home
        </button>
      )}

      <div className={embedded ? "w-full" : "w-full max-w-[638px]"}>

        {/* Logo */}
        {!embedded && (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FlaskConical size={22} className="text-blue-600" />
              <span className="font-bold text-gray-900 dark:text-white text-3xl">Spatial Biologics</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {mode === "login" && "Sign in to access docking, analytics and more"}
              {mode === "register" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
            </p>
          </div>
        )}

        {/* Card */}
        <div className={embedded ? "bg-white overflow-hidden" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-teal-500/30 rounded-3xl shadow-xl dark:shadow-[0_0_30px_rgba(20,184,166,0.15)] overflow-hidden p-6 md:p-8 animate-glow-pulse min-h-[550px] flex flex-col justify-start gap-4"}>

          {/* Sign In / Sign Up tabs */}
          {mode !== "forgot" && (
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-3 text-sm font-bold transition-all ${
                  mode === "login"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 py-3 text-sm font-bold transition-all ${
                  mode === "register"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Forgot password header */}
          {mode === "forgot" && (
            <div className="bg-gradient-to-r from-teal-900 to-teal-700 px-6 py-4 rounded-xl">
              <p className="text-white font-bold text-sm">Reset Password</p>
              <p className="text-teal-200 text-xs mt-0.5">
                Enter your email, new password, then verify with OTP
              </p>
            </div>
          )}

          <div className={embedded ? "p-6" : "p-6 flex-1 flex flex-col justify-start pt-2"}>
            {/* Alerts */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-lg px-3 py-2 text-xs mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400 rounded-lg px-3 py-2 text-xs mb-4">
                {success}
              </div>
            )}

            {/* ── SIGN IN ── */}
            {mode === "login" && (
              <div className="flex-1 flex flex-col justify-between">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="premium-label">
                      Email Address
                    </label>
                    <input
                      type="email" required placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="premium-label mb-0">Password</label>
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPass ? "text" : "password"} required
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="w-full rounded-xl px-3.5 py-2.5 pr-9 text-sm premium-input"
                      />
                      <button type="button" onClick={() => setShowLoginPass(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showLoginPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-teal-600 text-white py-2.5 rounded-xl text-xs font-bold premium-btn hover:bg-teal-700 disabled:opacity-50">
                    {loading ? "Please wait..." : "Sign In"}
                  </button>
                  <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                    No account?{" "}
                    <button type="button" onClick={() => switchMode("register")}
                      className="text-teal-600 dark:text-teal-400 hover:underline font-bold">
                      Create one
                    </button>
                  </p>
                </form>

                {/* Decorative Bio-security Animation Widget to fill empty space */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/40 flex flex-col items-center gap-3 text-center">
                  <div className="relative flex items-center justify-center w-14 h-14">
                    {/* Ring 1 - slow rotation */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-teal-500/30 animate-[spin_10s_linear_infinite]" />
                    {/* Ring 2 - fast reverse rotation */}
                    <div className="absolute inset-1 rounded-full border border-double border-blue-500/20 animate-[spin_5s_linear_infinite_reverse]" />
                    {/* Pulsing core */}
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/30 animate-pulse">
                      <ShieldAlert size={12} className="text-white animate-bounce" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Secure Node Active
                    </span>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                      Spatial Biologics secure gate. Docking engine, PDB visualizers & analytics initialized.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SIGN UP ── */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="premium-label">
                      Full Name *
                    </label>
                    <input type="text" required placeholder="Dr. Jane Smith"
                      value={regForm.name}
                      onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input"
                    />
                  </div>
                  <div>
                    <label className="premium-label">
                      Phone Number
                    </label>
                    <input type="tel" placeholder="+91 98765 43210"
                      value={regForm.phone}
                      onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input"
                    />
                  </div>
                  <div>
                    <label className="premium-label">
                      Designation
                    </label>
                    <input type="text" placeholder="Professor / Researcher"
                      value={regForm.designation}
                      onChange={e => setRegForm({ ...regForm, designation: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input"
                    />
                  </div>
                  <div>
                    <label className="premium-label">
                      Affiliation
                    </label>
                    <input type="text" placeholder="University / Institute"
                      value={regForm.affiliation}
                      onChange={e => setRegForm({ ...regForm, affiliation: e.target.value })}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="premium-label">
                    Email Address *
                  </label>
                  <input type="email" required placeholder="you@example.com"
                    value={regForm.email}
                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="premium-label">
                      Password *
                    </label>
                    <div className="relative">
                      <input type={showRegPass ? "text" : "password"} required
                        placeholder="Min. 6 chars" minLength={6}
                        value={regForm.password}
                        onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                        className="w-full rounded-xl px-3.5 py-2.5 pr-9 text-sm premium-input"
                      />
                      <button type="button" onClick={() => setShowRegPass(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {showRegPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="premium-label">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input type={showRegConfirm ? "text" : "password"} required
                        placeholder="Repeat password"
                        value={regForm.confirmPassword}
                        onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                        className="w-full rounded-xl px-3.5 py-2.5 pr-9 text-sm premium-input"
                      />
                      <button type="button" onClick={() => setShowRegConfirm(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {showRegConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-teal-600 text-white py-2.5 rounded-xl text-xs font-bold premium-btn hover:bg-teal-700 disabled:opacity-50 mt-2">
                  {loading ? "Please wait..." : "Create Account"}
                </button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchMode("login")}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-bold">
                    Sign In
                  </button>
                </p>
              </form>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {mode === "forgot" && (
              <form
                onSubmit={forgotStep === "request" ? sendForgotOtp : verifyForgotOtp}
                className="space-y-4"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your email and new password, then click Send OTP to verify.
                </p>
                <div>
                  <label className="premium-label">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" required placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm premium-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="premium-label">
                    New Password
                  </label>
                  <div className="relative">
                    <input type={showForgotPass ? "text" : "password"} required
                      placeholder="••••••••" minLength={6}
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 pr-9 text-sm premium-input"
                    />
                    <button type="button" onClick={() => setShowForgotPass(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {showForgotPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="premium-label">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input type={showForgotConfirm ? "text" : "password"} required
                      placeholder="••••••••" minLength={6}
                      value={forgotConfirmPassword}
                      onChange={e => setForgotConfirmPassword(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 pr-9 text-sm premium-input"
                    />
                    <button type="button" onClick={() => setShowForgotConfirm(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {showForgotConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {forgotStep === "verify" && (
                  <div>
                    <label className="premium-label">
                      Enter OTP
                    </label>
                    <input type="text" required placeholder="6-digit OTP"
                      maxLength={6} value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm premium-input tracking-widest text-center font-bold"
                    />
                    <p className={`text-xs mt-1 ${forgotTimer > 0 ? "text-teal-600" : "text-orange-500"}`}>
                      {forgotTimer > 0
                        ? `OTP expires in ${forgotTimer}s`
                        : "OTP expired — resend to continue."}
                    </p>
                  </div>
                )}

                {forgotStep === "request" ? (
                  <button type="submit" disabled={loading}
                    className="w-full bg-teal-600 text-white py-2.5 rounded-xl text-xs font-bold premium-btn hover:bg-teal-700 disabled:opacity-50">
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                ) : (
                  <>
                    <button type="submit" disabled={loading}
                      className="w-full bg-teal-600 text-white py-2.5 rounded-xl text-xs font-bold premium-btn hover:bg-teal-700 disabled:opacity-50">
                      {loading ? "Updating..." : "Update Password"}
                    </button>
                    <button type="button" onClick={resendForgotOtp}
                      disabled={loading || !canResend}
                      className="w-full border border-slate-350 dark:border-slate-800 py-2.5 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Resend OTP
                    </button>
                  </>
                )}

                <div className="text-center">
                  <button type="button" onClick={() => switchMode("login")}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold mt-2">
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}