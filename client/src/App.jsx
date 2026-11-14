import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api, API_BASE, tokenStore } from "./api.js";
import Mascot from "./Mascot.jsx";
import LoadingScreen from "./LoadingScreen.jsx";

// The app's own data keys (same ones its Backup feature uses). Everything else stays per device.
const KEYS = ["cmoLogEntries", "cmoLogEntryCount", "cmoShiftState", "cmoHolidays", "cmoAbsent", "cmoUserName"];

const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export default function App() {
  const [phase, setPhase] = useState(tokenStore.get() ? "loading" : "login");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const started = useRef(false);

  // Check the session and open the app. The sign-in page never reads or uploads your data: the app itself loads it from the
  // cloud every time it opens, and an old copy left on this device is never used.
  const enter = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const { user } = await api.get("/auth/me");
      const previous = localStorage.getItem("clk_uid");
      if (previous && previous !== user.id) {
        // a different account on this browser must never see the last account's data
        [...KEYS, "clk_pending", "clk_stash", "clk_last"].forEach((k) => localStorage.removeItem(k));
      }
      localStorage.setItem("clk_uid", user.id);
      writeJSON("clk_user", { name: user.name, email: user.email, picture: user.picture });
      localStorage.setItem("clk_api", API_BASE);
      window.location.replace("/app.html");
    } catch (e) {
      if (!tokenStore.get()) { setError(e.message); return setPhase("login"); } // session expired, or the account was disabled
      setError(e.network ? "Can't reach the server. Check your connection and try again." : e.message);
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

  if (phase === "loading") return <LoadingScreen />;
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
