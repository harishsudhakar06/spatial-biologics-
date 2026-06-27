import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles/global.css";

import { WorkspaceProvider } from "./context/WorkspaceContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";

function WorkspaceWithUser({ children }) {
  const { user } = useAuth();
  return (
    <WorkspaceProvider user={user}>
      {children}
    </WorkspaceProvider>
  );
}

import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceWithUser>
          <ToastProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </ToastProvider>
        </WorkspaceWithUser>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);