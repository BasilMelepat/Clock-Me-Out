import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./styles.css";

// Same light/dark choice the app itself uses.
try {
  if (localStorage.getItem("cmoTheme") === "dark") document.body.classList.add("dark-mode");
} catch { /* storage unavailable */ }

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <main className="gate">
        <div className="card gate-card">
          <h1>Setup needed</h1>
          <p className="muted">Add <code>VITE_GOOGLE_CLIENT_ID</code> to your Vercel environment variables (or <code>client/.env</code>), then redeploy.</p>
        </div>
      </main>
    )}
  </React.StrictMode>
);
