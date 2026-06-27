import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    axios.get("/api/me", { withCredentials: true })
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await axios.post("/api/login", { email, password }, { withCredentials: true });
    setUser(r.data.user);
    setShowWelcome(true);
    return r.data.user;
  };

  const logout = async () => {
    await axios.post("/api/logout", {}, { withCredentials: true });
    setUser(null);
    setShowWelcome(false);
  };

  const register = async (name, email, password, phone = "", designation = "", affiliation = "") => {
    const r = await axios.post(
      "/api/register",
      { username: name, email, password, phone, designation, affiliation },
      { withCredentials: true }
    );
    setUser(r.data.user);
    setShowWelcome(true);
    return r.data;
  };

  const sendForgotPasswordOTP = async (email) => {
    const r = await axios.post("/api/forgot-password/send-otp", { email });
    return r.data;
  };

  const verifyOTPAndResetPassword = async (email, otp, newPassword) => {
    const r = await axios.post("/api/forgot-password/verify-otp", { email, otp, newPassword });
    return r.data;
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      showWelcome, setShowWelcome,
      login, logout, register,
      sendForgotPasswordOTP, verifyOTPAndResetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
