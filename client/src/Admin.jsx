import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi, adminToken } from "./adminApi.js";
import Mascot from "./Mascot.jsx";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtAgo = (d) => {
  if (!d) return "Never";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};
const fmtBytes = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const pad2 = (n) => String(n).padStart(2, "0");
const dur = (sec) => { const a = Math.abs(Math.round(sec)), h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
const signed = (sec) => `${sec < 0 ? "−" : "+"}${dur(sec)}`;
const localDay = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const shiftMonth = (key, n) => { const [y, m] = key.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
const monthName = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" }); };
const dash = (v) => (v === null || v === undefined ? "—" : v);

export default function Admin() {
  const [token, setToken] = useState(adminToken.get());

  useEffect(() => {
    document.title = "Admin · Clock me Out";
    const meta = Object.assign(document.createElement("meta"), { name: "robots", content: "noindex,nofollow" });
    document.head.appendChild(meta);
    const out = () => setToken(null);
    window.addEventListener("admin-logout", out);
    return () => { window.removeEventListener("admin-logout", out); meta.remove(); };
  }, []);

  if (!token) return <AdminLogin onLogin={(t) => { adminToken.set(t); setToken(t); }} />;
  return <Dashboard onLogout={() => { adminToken.clear(); setToken(null); }} />;
}

function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token } = await adminApi.post("/login", form);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="gate">
      <div className="card gate-card">
        <div className="gate-brand">
          <span className="gate-mark" aria-hidden="true">🛡️</span>
          <span className="gate-title">Admin</span>
        </div>
        <p className="muted">Sign in to manage Clock me Out.</p>
        <form className="gate-form" onSubmit={submit} style={{ marginTop: 16 }}>
          <label>Admin email
            <input type="email" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>Password
            <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <button className="gate-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : "Sign in"}</button>
        </form>
        {error && <p className="gate-error" role="alert">{error}</p>}
        <p className="muted small"><a href="/">← Back to the app</a></p>
      </div>
    </main>
  );
}

function Dashboard({ onLogout }) {
  const [view, setView] = useState("overview");
  const [stats, setStats] = useState(null);
  const [list, setList] = useState({ users: [], total: 0, page: 1, limit: 15 });
  const [recent, setRecent] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [me, setMe] = useState("");
  const [note, setNote] = useState("");
  const noteTimer = useRef(0);
  const flash = (msg) => { setNote(msg); clearTimeout(noteTimer.current); noteTimer.current = setTimeout(() => setNote(""), 2800); };
  const today = localDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [att, setAtt] = useState(null);
  const [day, setDay] = useState(today);

  const loadStats = useCallback(() => adminApi.get("/stats").then(setStats).catch((e) => setError(e.message)), []);
  const loadRecent = useCallback(() => adminApi.get("/users?page=1&limit=5").then((d) => setRecent(d.users)).catch(() => {}), []);
  const loadUsers = useCallback(
    () => adminApi.get(`/users?q=${encodeURIComponent(query)}&page=${page}&limit=15`).then(setList).catch((e) => setError(e.message)),
    [query, page]
  );
  const loadAtt = useCallback(() => adminApi.get(`/attendance?month=${month}`).then(setAtt).catch((e) => setError(e.message)), [month]);
  useEffect(() => { loadAtt(); }, [loadAtt]);
  const goMonth = (n) => { const m = shiftMonth(month, n); setMonth(m); setDay(m === today.slice(0, 7) ? today : `${m}-01`); };
  useEffect(() => { adminApi.get("/me").then((d) => setMe(d.email)).catch(() => {}); }, []);
  useEffect(() => { loadStats(); loadRecent(); }, [loadStats, loadRecent]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const refresh = () => { loadStats(); loadRecent(); loadUsers(); loadAtt(); };
  const run = async (fn, msg) => {
    setError("");
    try { await fn(); refresh(); if (msg) flash(msg); } catch (e) { setError(e.message); }
  };
  const toggleDisabled = (u) =>
    window.confirm(u.disabled ? `Enable ${u.email}?` : `Disable ${u.email}? They will be signed out and blocked.`) &&
    run(() => adminApi.patch(`/users/${u.id}`, { disabled: !u.disabled }), u.disabled ? `✅ ${u.email} enabled` : `🚫 ${u.email} disabled`);
  const unlock = (u) => run(() => adminApi.post(`/users/${u.id}/unlock`), `🔓 ${u.email} unlocked`);
  const remove = (u) =>
    window.confirm(`Permanently delete ${u.email} and all of their saved data? This can't be undone.`) &&
    run(async () => { await adminApi.del(`/users/${u.id}`); setDetail(null); }, `🗑️ ${u.email} deleted`);

  const s = stats;
  const googlePct = s ? pct(s.google, s.total) : 0;
  const maxSignups = Math.max(1, ...(s?.signups || []).map((d) => d.n));
  const pages = Math.max(1, Math.ceil(list.total / list.limit));
  const title = view === "overview" ? ["Overview", "How Clock me Out is doing"]
    : view === "attendance" ? ["Attendance", "Who is running late and who is ahead"]
    : ["Users", `${list.total} account${list.total === 1 ? "" : "s"}`];
  const tipList = tipsFor(s, att, monthName(month));
  const mood = att?.totals.late ? "surprised" : att?.totals.ahead ? "delighted" : null;

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-logo" aria-hidden="true">🛡️</span>
          <div><b>Clock me Out</b><small>Admin</small></div>
        </div>
        <nav className="adm-nav" aria-label="Admin sections">
          <button aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}><span aria-hidden="true">📊</span>Overview</button>
          <button aria-current={view === "attendance" ? "page" : undefined} onClick={() => setView("attendance")}><span aria-hidden="true">🗓️</span>Attendance{att?.totals.late ? <em className="count warn">{att.totals.late}</em> : null}</button>
          <button aria-current={view === "users" ? "page" : undefined} onClick={() => setView("users")}><span aria-hidden="true">👥</span>Users{s ? <em className="count">{s.total}</em> : null}</button>
        </nav>
        <div className="adm-side-foot">
          {me && <p className="muted small adm-me">{me}</p>}
          <button className="a-btn" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-top">
          <div><h1>{title[0]}</h1><p className="muted">{title[1]}</p></div>
          <button className="a-btn" onClick={() => { refresh(); flash("↻ Refreshed"); }}>↻ Refresh</button>
        </header>

        {error && <p className="admin-error" role="alert">{error}</p>}

        <Say mood={mood} tips={tipList} />

        {view === "overview" && (
          <>
            <section className="kpis" aria-label="Key numbers">
              <Kpi icon="👥" label="Total users" value={s?.total} sub={s ? `+${s.new7} this week · +${s.new30} this month` : ""} />
              <Kpi icon="🔥" label="Active this week" value={s?.active7} meter={s ? pct(s.active7, s.total) : 0} sub={s ? `${pct(s.active7, s.total)}% saved data in 7 days` : ""} />
              <Kpi icon="📒" label="With logged days" value={s?.withData} meter={s ? pct(s.withData, s.total) : 0} sub={s ? `${pct(s.withData, s.total)}% have a daily log` : ""} />
              <Kpi icon="🚫" label="Disabled" value={s?.disabled} sub="blocked from signing in" />
            </section>

            <section className="adm-row">
              <div className="card">
                <div className="card-title"><span>New sign-ups · 14 days</span><span className="chip">{s ? s.signups.reduce((a, d) => a + d.n, 0) : "…"} total</span></div>
                <div className="a-chart" role="img" aria-label="Bar chart of daily sign-ups">
                  {(s?.signups || []).map((d) => (
                    <div className="a-bar" key={d.date} title={`${d.date}: ${d.n}`}>
                      <span className="a-bar-n">{d.n || ""}</span>
                      <span className="a-bar-fill" style={{ height: `${(d.n / maxSignups) * 100}%` }} />
                      <small>{d.date.slice(8)}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title"><span>Sign-in methods</span></div>
                <div className="donut-wrap">
                  <div className="donut" style={{ background: s && s.total ? `conic-gradient(var(--sky) 0 ${googlePct}%, var(--warm) ${googlePct}% 100%)` : "var(--sky-light)" }}>
                    <i>{s ? s.total : "…"}</i>
                  </div>
                  <ul className="split">
                    <li><span className="dot g" />Google<b>{s ? s.google : "…"}</b></li>
                    <li><span className="dot e" />Email<b>{s ? s.password : "…"}</b></li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="adm-row2">
              <Board kind="late" rows={att?.late} limit={5} month={month} onPick={setDetail} onMore={() => setView("attendance")} />
              <Board kind="ahead" rows={att?.ahead} limit={5} month={month} onPick={setDetail} onMore={() => setView("attendance")} />
            </section>

            <section className="card">
              <div className="card-title"><span>Latest sign-ups</span><button className="a-btn" onClick={() => setView("users")}>All users →</button></div>
              <ul className="feed">
                {recent.length === 0 && <li className="muted">No users yet.</li>}
                {recent.map((u) => (
                  <li key={u.id}>
                    <button className="feed-row" onClick={() => setDetail(u.id)}>
                      <span className="a-user">
                        {u.picture ? <img src={u.picture} alt="" referrerPolicy="no-referrer" /> : <span className="a-avatar">{(u.name || u.email)[0].toUpperCase()}</span>}
                        <span><strong>{u.name || "—"}</strong><br /><span className="muted small">{u.email}</span></span>
                      </span>
                      <span className="feed-meta"><span className="pill info">{u.method === "google" ? "Google" : "Email"}</span><span className="muted small">{fmtAgo(u.createdAt)}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {view === "attendance" && (
          <>
            <Attendance month={month} goMonth={goMonth} att={att} day={day} setDay={setDay} today={today} onPick={setDetail} />
            <section className="adm-row2">
              <Board kind="late" rows={att?.late} limit={10} month={month} onPick={setDetail} />
              <Board kind="ahead" rows={att?.ahead} limit={10} month={month} onPick={setDetail} />
            </section>
          </>
        )}

        {view === "users" && (
          <section className="card">
            <div className="a-toolbar">
              <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
                <input type="search" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
                <button className="a-btn" type="submit">Search</button>
              </form>
            </div>
            <div className="a-scroll">
              <table className="a-table">
                <thead><tr><th>User</th><th>Method</th><th className="hide-sm">Joined</th><th className="hide-sm">Last saved</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.users.length === 0 && <tr><td colSpan="6" className="muted">{stats ? "No users found." : "Loading…"}</td></tr>}
                  {list.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="a-user">
                          {u.picture ? <img src={u.picture} alt="" referrerPolicy="no-referrer" /> : <span className="a-avatar">{(u.name || u.email)[0].toUpperCase()}</span>}
                          <div><strong>{u.name || "—"}</strong><br /><span className="muted small">{u.email}</span></div>
                        </div>
                      </td>
                      <td>{u.method === "google" ? "Google" : "Email"}</td>
                      <td className="hide-sm">{fmtDate(u.createdAt)}</td>
                      <td className="hide-sm">{fmtAgo(u.lastSaved)}</td>
                      <td>{u.disabled ? <span className="pill bad">Disabled</span> : u.locked ? <span className="pill warn">Locked</span> : <span className="pill ok">Active</span>}</td>
                      <td className="a-actions">
                        <button className="a-btn" onClick={() => setDetail(u.id)}>View</button>
                        <button className="a-btn" onClick={() => toggleDisabled(u)}>{u.disabled ? "Enable" : "Disable"}</button>
                        {u.locked && <button className="a-btn" onClick={() => unlock(u)}>Unlock</button>}
                        <button className="a-btn danger" onClick={() => remove(u)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="a-pager">
              <button className="a-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Prev</button>
              <span className="muted">Page {list.page} of {pages}</span>
              <button className="a-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next ›</button>
            </div>
          </section>
        )}
      </main>

      {note && <div className="a-toast" role="status">{note}</div>}
      {detail && <Detail id={detail} onClose={() => setDetail(null)} onChanged={refresh} setError={setError} />}
    </div>
  );
}

function Kpi({ icon, label, value, sub, meter }) {
  return (
    <div className="card kpi">
      <div className="kpi-head"><span className="kpi-ico" aria-hidden="true">{icon}</span><span className="kpi-label">{label}</span></div>
      <strong className="kpi-value">{value === undefined ? "…" : value}</strong>
      {meter !== undefined && <div className="meter"><span style={{ width: `${meter}%` }} /></div>}
      {sub ? <span className="muted small">{sub}</span> : null}
    </div>
  );
}

function Detail({ id, onClose, onChanged, setError }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let live = true;
    adminApi.get(`/users/${id}`).then((d) => live && setInfo(d)).catch((e) => { setError(e.message); onClose(); });
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { live = false; window.removeEventListener("keydown", esc); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const u = info?.user;
  const s = info?.summary;

  return (
    <div className="a-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label="User details">
      <div className="card a-modal">
        <div className="a-modal-head">
          <h2>User details</h2>
          <button className="a-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {!u ? <p className="muted">Loading…</p> : (
          <>
            <div className="a-user big">
              {u.picture ? <img src={u.picture} alt="" referrerPolicy="no-referrer" /> : <span className="a-avatar">{(u.name || u.email)[0].toUpperCase()}</span>}
              <div><strong>{u.name || "—"}</strong><br /><span className="muted">{u.email}</span></div>
            </div>
            <dl className="a-dl">
              <div><dt>Sign-in method</dt><dd>{u.method === "google" ? "Google" : "Email + password"}</dd></div>
              <div><dt>Joined</dt><dd>{fmtDate(u.createdAt)}</dd></div>
              <div><dt>Status</dt><dd>{u.disabled ? "Disabled" : u.locked ? "Locked (failed sign-ins)" : "Active"}</dd></div>
              <div><dt>Days logged</dt><dd>{s ? dash(s.daysLogged) : "No data yet"}</dd></div>
              <div><dt>Holidays / absences</dt><dd>{s ? `${dash(s.holidays)} / ${dash(s.absences)}` : "—"}</dd></div>
              <div><dt>Last saved</dt><dd>{s ? fmtAgo(s.lastSaved) : "Never"}</dd></div>
              <div><dt>Saves / size</dt><dd>{s ? `${s.saves} / ${fmtBytes(s.bytes)}` : "—"}</dd></div>
            </dl>
            <p className="muted small">For privacy, the dashboard shows summaries only, never a person's actual entries.</p>
          </>
        )}
      </div>
    </div>
  );
}

function tipsFor(s, att, label) {
  const t = att?.totals, out = [];
  const people = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (t) {
    if (t.late) out.push(`${people(t.late, "person is", "people are")} running late in ${label}. Check the Running late list.`);
    else if (t.people) out.push(`Nobody is running late in ${label}. 🎉`);
    if (t.ahead) out.push(`${people(t.ahead, "person is", "people are")} ahead of target. Nice work!`);
    out.push(t.people ? `${people(t.people, "person has", "people have")} logged hours in ${label}.` : `Nobody has logged hours in ${label} yet.`);
  }
  if (s) {
    out.push(s.new7 ? `${people(s.new7, "new user", "new users")} joined this week.` : "No new sign-ups this week yet.");
    if (s.disabled) out.push(`${people(s.disabled, "account is", "accounts are")} disabled.`);
  }
  out.push("Hi admin! Tap me for another tip. 👋");
  return out;
}

function Say({ mood, tips }) {
  const [i, setI] = useState(0);
  return (
    <div className="say" onClick={() => setI(i + 1)}>
      <Mascot mood={mood} />
      <div className="say-bubble" role="status"><p>{tips[i % tips.length]}</p><small>Tap me for another tip</small></div>
    </div>
  );
}

function Who({ u }) {
  return (
    <span className="a-user">
      {u.picture ? <img src={u.picture} alt="" referrerPolicy="no-referrer" /> : <span className="a-avatar">{(u.name || u.email)[0].toUpperCase()}</span>}
      <span><strong>{u.name || "—"}</strong><br /><span className="muted small">{u.email}</span></span>
    </span>
  );
}

function Board({ kind, rows, limit, month, onPick, onMore }) {
  const late = kind === "late";
  const list = (rows || []).slice(0, limit);
  return (
    <div className="card">
      <div className="card-title">
        <span>{late ? "⏰ Running late" : "🚀 Ahead of target"}</span>
        {onMore ? <button className="a-btn" onClick={onMore}>Attendance →</button> : <span className="chip">{monthName(month)}</span>}
      </div>
      <ul className="feed">
        {!rows && <li className="muted">Loading…</li>}
        {rows && list.length === 0 && <li className="muted">{late ? "Nobody is behind target. 🎉" : "Nobody is ahead yet."}</li>}
        {list.map((u) => (
          <li key={u.id}>
            <button className="feed-row" onClick={() => onPick(u.id)}>
              <Who u={u} />
              <span className="feed-meta"><span className="muted small">{u.days} day{u.days === 1 ? "" : "s"}</span><span className={`pill ${late ? "bad" : "ok"}`}>{signed(u.balanceSec)}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Attendance({ month, goMonth, att, day, setDay, today, onPick }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let live = true;
    setInfo(null);
    adminApi.get(`/attendance/day?date=${day}`).then((d) => live && setInfo(d)).catch(() => {});
    return () => { live = false; };
  }, [day]);

  const [y, mo] = month.split("-").map(Number);
  const lead = new Date(y, mo - 1, 1).getDay();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: new Date(y, mo, 0).getDate() }, (_, i) => i + 1)];

  return (
    <section className="att-grid">
      <div className="card">
        <div className="card-title">
          <span>🗓️ Calendar</span>
          <span className="mnav">
            <button className="a-btn" onClick={() => goMonth(-1)} aria-label="Previous month">‹</button>
            <strong>{monthName(month)}</strong>
            <button className="a-btn" onClick={() => goMonth(1)} aria-label="Next month">›</button>
          </span>
        </div>
        <div className="acal">
          {WEEK.map((w) => <span className="acal-h" key={w}>{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const ds = `${month}-${pad2(d)}`, c = att?.days?.[ds];
            const tone = c?.logged ? (c.short > c.onTarget ? "short" : "ok") : c?.holiday ? "holiday" : c?.absent ? "absent" : "none";
            return (
              <button key={ds} className={`acal-d ${tone}${ds === day ? " sel" : ""}${ds === today ? " today" : ""}`} onClick={() => setDay(ds)} aria-label={ds}>
                <b>{d}</b>
                {c?.logged ? <small>{c.logged} logged</small> : c?.holiday ? <small>Holiday</small> : c?.absent ? <small>{c.absent} absent</small> : null}
                {c?.logged ? <span className="acal-bar"><i style={{ width: `${(c.onTarget / c.logged) * 100}%` }} /></span> : null}
              </button>
            );
          })}
        </div>
        <ul className="legend"><li className="ok">Mostly on target</li><li className="short">Mostly short</li><li className="holiday">Holiday</li><li className="absent">Absent</li></ul>
      </div>

      <div className="card">
        <div className="card-title"><span>{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span></div>
        {!info && <p className="muted">Loading…</p>}
        {info && info.logged.length === 0 && info.off.length === 0 && <p className="muted">Nobody logged hours or marked this day off.</p>}
        {info && info.logged.length > 0 && (
          <ul className="feed">
            {info.logged.map((u) => {
              const diff = u.clockedSec - u.targetSec;
              return (
                <li key={u.id}>
                  <button className="feed-row" onClick={() => onPick(u.id)}>
                    <Who u={u} />
                    <span className="feed-meta"><span className="muted small">{dur(u.clockedSec)}</span><span className={`pill ${diff < 0 ? "bad" : "ok"}`}>{diff === 0 ? "On target" : signed(diff)}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {info && info.off.length > 0 && (
          <>
            <div className="card-title" style={{ marginTop: 14 }}><span>Off this day</span></div>
            <ul className="feed">
              {info.off.map((u) => (
                <li key={u.id}><button className="feed-row" onClick={() => onPick(u.id)}><Who u={u} /><span className={`pill ${u.type === "absent" ? "bad" : "info"}`}>{u.type === "absent" ? "Absent" : "Holiday"}</span></button></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
