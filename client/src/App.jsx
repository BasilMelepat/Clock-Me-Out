import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api, API_BASE, tokenStore } from "./api.js";
import Mascot from "./Mascot.jsx";

// The app's own data keys (same ones its Backup feature uses). Everything else stays per device.
const KEYS = ["cmoLogEntries", "cmoLogEntryCount", "cmoShiftState", "cmoHolidays", "cmoAbsent", "cmoUserName"];

// The shift state has a savedAt timestamp that changes on every save; it doesn't count as a change.
const strip = (k, v) => {
  if (k !== "cmoShiftState") return v;
  try { const o = JSON.parse(v); if (o && typeof o === "object") { delete o.savedAt; return JSON.stringify(o); } } catch { /* keep as is */ }
  return v;
};
const norm = (o) => JSON.stringify(KEYS.filter((k) => o && typeof o[k] === "string").map((k) => [k, strip(k, o[k])]));
const snapshot = () => Object.fromEntries(KEYS.map((k) => [k, localStorage.getItem(k)]).filter(([, v]) => v !== null));
const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function applyServer(data) {
  KEYS.forEach((k) => (typeof data[k] === "string" ? localStorage.setItem(k, data[k]) : localStorage.removeItem(k)));
  writeJSON("clk_synced", data);
  localStorage.setItem("clk_last", String(Date.now()));
  localStorage.removeItem("clk_pending");
}

export default function App() {
  const [phase, setPhase] = useState(tokenStore.get() ? "loading" : "login");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
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
      localStorage.setItem("clk_last", String(Date.now()));
      localStorage.setItem("clk_uid", user.id);
      writeJSON("clk_user", { name: user.name, email: user.email });
      localStorage.setItem("clk_api", API_BASE);
      window.location.replace("/app.html");
    } catch (e) {
      if (!tokenStore.get()) { setError(e.message); return setPhase("login"); } // session expired, or the account was disabled
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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const signup = mode === "signup";
      const body = signup ? form : { email: form.email, password: form.password };
      const { token } = await api.post(signup ? "/auth/register" : "/auth/login", body);
      tokenStore.set(token);
      enter();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const dark = document.body.classList.contains("dark-mode");
  // The mascot looks away shyly while a password is typed, and reacts to errors and loading.
  const mood = error ? "surprised" : phase === "loading" ? "delighted" : pwFocus ? "bashful" : null;

  return (
    <main className="gate">
      <div className="card gate-card">
        <div className="gate-mascot"><Mascot mood={mood} /></div>
        <div className="gate-brand">
          <span className="gate-title">Clock me Out</span>
        </div>

        {phase === "login" && (
          <>
            <div className="gate-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => switchMode("signin")}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>Sign up</button>
            </div>

            {mode === "signup" && <p className="muted small gate-note">Your hours stay private to you, except the site admin can see summaries such as days logged and whether you are ahead of or behind target.</p>}
            <form className="gate-form" onSubmit={submit}>
              {mode === "signup" && (
                <label>
                  Name
                  <input type="text" value={form.name} onChange={set("name")} maxLength={60} autoComplete="name" placeholder="Your name" />
                </label>
              )}
              <label>
                Email
                <input type="email" value={form.email} onChange={set("email")} required autoComplete="email" placeholder="you@example.com" />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  maxLength={128}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                />
              </label>
              <button className="gate-submit" type="submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="gate-or"><span>or</span></div>
            <div className="gate-btn">
              <GoogleLogin
                onSuccess={onGoogle}
                onError={() => setError("Google sign-in failed. Try again.")}
                theme={dark ? "filled_black" : "outline"}
                shape="pill"
                size="large"
                text={mode === "signup" ? "signup_with" : "signin_with"}
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
