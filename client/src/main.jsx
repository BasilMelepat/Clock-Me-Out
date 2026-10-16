import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import "./styles.css";

// Same light/dark choice the app itself uses.
try {
  if (localStorage.getItem("cmoTheme") === "dark") document.body.classList.add("dark-mode");
} catch { /* storage unavailable */ }

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const root = createRoot(document.getElementById("root"));
const isAdmin = /^\/admin\/?$/.test(window.location.pathname);

if (isAdmin) {
  root.render(<React.StrictMode><Admin /></React.StrictMode>);
} else root.render(
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
