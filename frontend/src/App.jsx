import React from "react";
import Dashboard from "./pages/Dashboard";
import WelcomeMessage from "./components/WelcomeMessage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { showWelcome, setShowWelcome, user } = useAuth();

  return (
    <>
      {showWelcome && (
        <WelcomeMessage
          username={user?.username || user?.name}
          onDone={() => setShowWelcome(false)}
        />
      )}
      <Dashboard />
    </>
  );
}
