import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api, API_BASE, tokenStore } from "./api.js";

// The app's own data keys (same ones its Backup feature uses). Everything else stays per device.
const KEYS = ["cmoLogEntries", "cmoLogEntryCount", "cmoShiftState", "cmoHolidays", "cmoAbsent", "cmoUserName"];

const norm = (o) => JSON.stringify(KEYS.filter((k) => o && typeof o[k] === "string").map((k) => [k, o[k]]));
const snapshot = () => Object.fromEntries(KEYS.map((k) => [k, localStorage.getItem(k)]).filter(([, v]) => v !== null));
const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function applyServer(data) {
  KEYS.forEach((k) => (typeof data[k] === "string" ? localStorage.setItem(k, data[k]) : localStorage.removeItem(k)));
  writeJSON("clk_synced", data);
}

export default function App() {
  const [phase, setPhase] = useState(tokenStore.get() ? "loading" : "login");
  const [error, setError] = useState("");
  const started = useRef(false);

  // Download this account's data, then open the app.
  const enter = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const [{ user }, { data }] = await Promise.all([api.get("/auth/me"), api.get("/state")]);
      const sameAccount = localStorage.getItem("clk_uid") === user.id;
      const local = snapshot();
      const unsynced = sameAccount && norm(local) !== norm(readJSON("clk_synced") || {});

      if (unsynced) {
        // This device has changes that never reached the server (for example after an expired session): keep them.
        await api.put("/state", { data: local });
        writeJSON("clk_synced", local);
      } else if (data) {
        applyServer(data);
      } else {
        // Brand-new account: start from whatever is on this device (usually nothing).
        const seed = sameAccount || !Object.keys(local).length ? local : {};
        if (!sameAccount) KEYS.forEach((k) => localStorage.removeItem(k));
        if (Object.keys(seed).length) await api.put("/state", { data: seed });
        writeJSON("clk_synced", seed);
      }
      localStorage.setItem("clk_uid", user.id);
      writeJSON("clk_user", { name: user.name, email: user.email });
      localStorage.setItem("clk_api", API_BASE);
      window.location.replace("/app.html");
    } catch (e) {
      if (!tokenStore.get()) return setPhase("login"); // session expired or rejected
      if (e.network && localStorage.getItem("clk_api")) return window.location.replace("/app.html"); // offline: use what's on this device
      setError(e.message);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (started.current || !tokenStore.get()) return;
    started.current = true;
    enter();
  }, [enter]);

  const onGoogle = async (res) => {
    try {
      const { token } = await api.post("/auth/google", { credential: res.credential });
      tokenStore.set(token);
      enter();
    } catch (e) {
      setError(e.message);
      setPhase("login");
    }
  };

  const dark = document.body.classList.contains("dark-mode");

  return (
    <main className="gate">
      <div className="card gate-card">
        <div className="gate-brand">
          <span className="gate-mark" aria-hidden="true">🖥️</span>
          <span className="gate-title">Clock me Out</span>
        </div>

        {phase === "login" && (
          <>
            <p className="muted">Sign in to save your shifts and daily log to your account and use them on any device.</p>
            <div className="gate-btn">
              <GoogleLogin
                onSuccess={onGoogle}
                onError={() => setError("Google sign-in failed. Try again.")}
                theme={dark ? "filled_black" : "outline"}
                shape="pill"
                size="large"
              />
            </div>
          </>
        )}

        {phase === "loading" && <p className="muted" role="status">Loading your data…</p>}

        {phase === "error" && (
          <>
            <p className="muted">Couldn't load your data.</p>
            <button className="gate-retry" onClick={enter}>Try again</button>
          </>
        )}

        {error && <p className="gate-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
