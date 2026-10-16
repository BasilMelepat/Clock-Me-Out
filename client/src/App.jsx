import { useCallback, useEffect, useRef, useState } from "react";
import { api, tokenStore } from "./api.js";
import useNow from "./hooks/useNow.js";
import { computeShift } from "./lib/calc.js";
import { hmToSec, todayStr } from "./lib/time.js";
import { notify } from "./lib/sound.js";
import Login from "./components/Login.jsx";
import ShiftTab from "./components/ShiftTab.jsx";
import LogTab from "./components/LogTab.jsx";
import OverviewTab from "./components/OverviewTab.jsx";
import SettingsTab from "./components/SettingsTab.jsx";

const emptyShift = () => ({ date: todayStr(), clockIn: "", targetHours: 8, breaks: [], lateMin: 0, departure: "" });
const byDate = (a, b) => a.date.localeCompare(b.date);
const TABS = [["shift", "Shift"], ["log", "Log"], ["overview", "Overview"], ["settings", "Settings"]];
const ALERT_WINDOW = 90; // seconds: only alert for moments that just happened, not ones already in the past

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(!!tokenStore.get());
  const [shift, setShift] = useState(emptyShift());
  const [logs, setLogs] = useState([]);
  const [off, setOff] = useState([]);
  const [tab, setTab] = useState("shift");
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [toastMsg, setToastMsg] = useState("");

  const nowS = useNow();
  const shiftRef = useRef(shift);
  const saveTimer = useRef();
  const toastTimer = useRef();
  const fired = useRef(new Set());

  const toast = (msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2800);
  };

  const loadAll = useCallback(async () => {
    const [me, sh, lg, ho] = await Promise.all([api.get("/auth/me"), api.get("/shift"), api.get("/logs"), api.get("/holidays")]);
    setUser(me.user);
    setLogs(lg.logs);
    setOff(ho.holidays);
    let s = sh.shift ? { ...emptyShift(), ...sh.shift } : emptyShift();
    if (s.date !== todayStr()) s = { ...s, date: todayStr(), clockIn: "", breaks: [], departure: "" }; // new day
    shiftRef.current = s;
    setShift(s);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) return;
    loadAll().catch(() => tokenStore.clear()).finally(() => setBooting(false));
  }, [loadAll]);

  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("cmo-logout", out);
    return () => window.removeEventListener("cmo-logout", out);
  }, []);

  const onLogin = async (token) => {
    tokenStore.set(token);
    setBooting(true);
    try { await loadAll(); } catch (e) { tokenStore.clear(); toast(e.message); } finally { setBooting(false); }
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    setLogs([]);
    setOff([]);
    setTab("shift");
  };

  // Shift edits save to the server after a short pause.
  const updateShift = (patch) => {
    const next = { ...shiftRef.current, ...patch, date: todayStr() };
    shiftRef.current = next;
    setShift(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => api.put("/shift", next).catch(() => toast("Couldn't save your shift")), 500);
  };
  const clearShift = () => updateShift({ clockIn: "", breaks: [], departure: "" });

  const calc = computeShift(shift, nowS);

  // Sound / notification alerts at the three key moments.
  useEffect(() => {
    if (!calc || !user) return;
    const fire = (key, msg) => {
      const k = `${shift.date}:${key}`;
      if (fired.current.has(k)) return;
      fired.current.add(k);
      notify(user.settings, msg);
    };
    if (shift.lateMin > 0 && calc.worked >= calc.baseS && calc.worked < calc.baseS + ALERT_WINDOW) fire("base", "You've hit today's base target. Keep going to cover your backlog.");
    if (calc.done && calc.worked < calc.targetS + ALERT_WINDOW) fire("target", shift.lateMin > 0 ? "Backlog covered. You can clock out." : "Target reached. You can clock out.");
    if (shift.departure) {
      const d = hmToSec(shift.departure);
      if (nowS >= d && nowS < d + ALERT_WINDOW) fire("dep", "Planned departure time reached.");
    }
  }, [nowS]); // eslint-disable-line react-hooks/exhaustive-deps

  const raw = {
    async saveLog(date, clockedSec, targetSec) {
      const { log } = await api.put(`/logs/${date}`, { clockedSec, targetSec });
      setLogs((p) => [...p.filter((l) => l.date !== date), log].sort(byDate));
    },
    async deleteLog(date) {
      await api.del(`/logs/${date}`);
      setLogs((p) => p.filter((l) => l.date !== date));
    },
    async bulkSave(entries) {
      await api.post("/logs/bulk", { entries });
      setLogs((await api.get("/logs")).logs);
    },
    async importExcel(files, defaultTarget) {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("defaultTarget", String(defaultTarget));
      const r = await api.upload("/import/excel", form);
      const [lg, ho, me] = await Promise.all([api.get("/logs"), api.get("/holidays"), api.get("/auth/me")]);
      setLogs(lg.logs);
      setOff(ho.holidays);
      setUser(me.user);
      return r;
    },
    async clearMonthLogs(m) {
      await api.del(`/logs?month=${m}`);
      setLogs((p) => p.filter((l) => !l.date.startsWith(m)));
    },
    async saveOff(date, type) {
      const { holiday } = await api.put(`/holidays/${date}`, { type });
      setOff((p) => [...p.filter((o) => o.date !== date), holiday].sort(byDate));
    },
    async deleteOff(date) {
      await api.del(`/holidays/${date}`);
      setOff((p) => p.filter((o) => o.date !== date));
    },
    syncBalance(m) {
      const ml = logs.filter((l) => l.date.startsWith(m));
      const behind = ml.reduce((a, l) => a + (l.targetSec - l.clockedSec), 0);
      updateShift({ lateMin: Math.max(0, Math.round(behind / 60)) });
    },
    async saveProfile(patch) {
      const { user: u } = await api.patch("/auth/me", patch);
      setUser(u);
    },
    async restore(json) {
      const r = await api.post("/data/restore", json);
      await loadAll();
      return r;
    },
    async flush() {
      await api.del("/data");
      await loadAll();
      toast("Everything was deleted");
    },
  };
  // Show server errors as a toast instead of crashing the UI.
  const actions = Object.fromEntries(
    Object.entries(raw).map(([k, fn]) => [k, async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message); } }])
  );

  if (booting) return <main className="login"><p className="muted">Loading…</p></main>;
  if (!user) return <Login onLogin={onLogin} />;

  return (
    <div className="app">
      <header className="top">
        <h1>Clock me Out</h1>
        {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
      </header>

      <main className="content">
        {tab === "shift" && <ShiftTab user={user} shift={shift} calc={calc} nowS={nowS} updateShift={updateShift} clearShift={clearShift} />}
        {tab === "log" && <LogTab shift={shift} calc={calc} logs={logs} off={off} month={month} setMonth={setMonth} actions={actions} toast={toast} goShift={() => setTab("shift")} />}
        {tab === "overview" && <OverviewTab shift={shift} logs={logs} off={off} month={month} setMonth={setMonth} />}
        {tab === "settings" && <SettingsTab user={user} actions={actions} toast={toast} logout={logout} />}
      </main>

      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}

      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label]) => (
          <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
