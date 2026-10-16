import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [error, setError] = useState("");

  return (
    <main className="login">
      <div className="login-card">
        <div className="login-clock" aria-hidden="true">
          <span>17:30</span>
        </div>
        <h1>Clock me Out</h1>
        <p>Know exactly when you can leave. Sign in to keep your shifts and daily log on every device.</p>
        <div className="login-btn">
          <GoogleLogin
            onSuccess={async (res) => {
              try {
                const data = await api.post("/auth/google", { credential: res.credential });
                onLogin(data.token, data.user);
              } catch (e) {
                setError(e.message);
              }
            }}
            onError={() => setError("Google sign-in failed. Try again.")}
          />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
