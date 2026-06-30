import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function ForgotPasswordModal({ onClose, onBackToLogin }) {
  const { sendForgotPasswordOTP, verifyOTPAndResetPassword } = useAuth();
  
  const [step, setStep] = useState("email"); // "email" -> "password" -> "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  // OTP Timer - 30 seconds
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && step === "otp" && !canResend) {
      setCanResend(true);
    }
  }, [timer, step, canResend]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await sendForgotPasswordOTP(email);
      if (result.devOtp) {
        setDevOtp(result.devOtp);
        setMessage(`OTP sent. (Dev fallback OTP: ${result.devOtp})`);
      } else {
        setDevOtp("");
        setMessage("OTP sent to your Gmail!");
      }
      setTimer(30);
      setCanResend(false);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await sendForgotPasswordOTP(email);
      if (result.devOtp) {
        setDevOtp(result.devOtp);
        setMessage(`OTP resent. (Dev fallback OTP: ${result.devOtp})`);
      } else {
        setDevOtp("");
        setMessage("OTP resent to your Gmail!");
      }
      setTimer(30);
      setCanResend(false);
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTPAndReset = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!otp || otp.length < 6) {
      setError("Please enter a valid OTP");
      return;
    }

    setLoading(true);
    try {
      await verifyOTPAndResetPassword(email, otp, newPassword);
      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => onBackToLogin(), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP or reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
        <button
          onClick={onClose}
          className="float-right text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded px-3 py-2 text-sm mb-4">
            {message}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength="6"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength="6"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sending OTP..." : "Send OTP to Email"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOTPAndReset} className="space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-3">Email: <strong>{email}</strong></p>
              <p className="text-xs text-gray-500">A 6-digit OTP has been sent to your Gmail</p>
              {devOtp && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                  <p className="text-xs font-bold text-yellow-700">Dev Fallback OTP:</p>
                  <p className="text-lg font-mono font-bold text-yellow-800 tracking-widest text-center mt-1">{devOtp}</p>
                  <p className="text-xs text-yellow-600 mt-1">Email delivery failed. Use this OTP to continue.</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="000000"
                required
                maxLength="6"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 text-center tracking-widest"
              />
              <div className="mt-2 text-xs text-gray-500">
                {timer > 0 ? (
                  <span>OTP expires in <strong>{timer}s</strong></span>
                ) : (
                  <span className="text-orange-600">OTP expired</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || timer === 0}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Update Password"}
            </button>

            {canResend || timer === 0 ? (
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Resend OTP"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
                setError("");
                setMessage("");
                setTimer(0);
              }}
              className="w-full text-blue-600 text-sm hover:underline"
            >
              Use different email
            </button>
          </form>
        )}

        <button
          onClick={onBackToLogin}
          className="w-full mt-4 text-gray-600 text-sm hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
