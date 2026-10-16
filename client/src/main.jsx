import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./styles.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <main className="login">
        <div className="login-card">
          <h1>Setup needed</h1>
          <p>Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>client/.env</code> (or your Vercel environment variables), then restart.</p>
        </div>
      </main>
    )}
  </React.StrictMode>
);
