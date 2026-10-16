import { useCallback, useEffect, useState } from "react";
import { adminApi, adminToken } from "./adminApi.js";

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
  const [stats, setStats] = useState(null);
  const [list, setList] = useState({ users: [], total: 0, page: 1, limit: 15 });
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  const loadStats = useCallback(() => adminApi.get("/stats").then(setStats).catch((e) => setError(e.message)), []);
  const loadUsers = useCallback(
    () => adminApi.get(`/users?q=${encodeURIComponent(query)}&page=${page}&limit=15`).then(setList).catch((e) => setError(e.message)),
    [query, page]
  );
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const refresh = () => { loadStats(); loadUsers(); };
  const run = async (fn) => {
    setError("");
    try { await fn(); refresh(); } catch (e) { setError(e.message); }
  };

  const toggleDisabled = (u) =>
    window.confirm(u.disabled ? `Enable ${u.email}?` : `Disable ${u.email}? They will be signed out and blocked.`) &&
    run(() => adminApi.patch(`/users/${u.id}`, { disabled: !u.disabled }));
  const unlock = (u) => run(() => adminApi.post(`/users/${u.id}/unlock`));
  const remove = (u) =>
    window.confirm(`Permanently delete ${u.email} and all of their saved data? This can't be undone.`) &&
    run(async () => { await adminApi.del(`/users/${u.id}`); setDetail(null); });

  const pages = Math.max(1, Math.ceil(list.total / list.limit));
  const maxSignups = Math.max(1, ...(stats?.signups || []).map((d) => d.n));

  return (
    <div className="admin">
      <header className="admin-head">
        <div className="gate-brand"><span className="gate-mark" aria-hidden="true">🛡️</span><span className="gate-title">Clock me Out · Admin</span></div>
        <div className="admin-head-actions">
          <button className="a-btn" onClick={refresh}>↻ Refresh</button>
          <button className="a-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="stat-grid" aria-label="Overview">
        <Stat label="Total users" value={stats?.total} />
        <Stat label="New (7 days)" value={stats?.new7} sub={stats ? `${stats.new30} in 30 days` : ""} />
        <Stat label="Active (7 days)" value={stats?.active7} sub="saved data this week" />
        <Stat label="With logged days" value={stats?.withData} />
        <Stat label="Google / Email" value={stats ? `${stats.google} / ${stats.password}` : undefined} />
        <Stat label="Disabled" value={stats?.disabled} />
      </section>

      <section className="card admin-card">
        <h2>New sign-ups, last 14 days</h2>
        <div className="a-chart" role="img" aria-label="Bar chart of daily sign-ups">
          {(stats?.signups || []).map((d) => (
            <div className="a-bar" key={d.date} title={`${d.date}: ${d.n}`}>
              <span className="a-bar-n">{d.n || ""}</span>
              <span className="a-bar-fill" style={{ height: `${(d.n / maxSignups) * 100}%` }} />
              <small>{d.date.slice(8)}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card admin-card">
        <div className="a-toolbar">
          <h2>Users <span className="muted">({list.total})</span></h2>
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
            <input type="search" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
            <button className="a-btn" type="submit">Search</button>
          </form>
        </div>

        <div className="a-scroll">
          <table className="a-table">
            <thead>
              <tr><th>User</th><th>Method</th><th className="hide-sm">Joined</th><th className="hide-sm">Last saved</th><th>Status</th><th /></tr>
            </thead>
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
                  <td>
                    {u.disabled ? <span className="pill bad">Disabled</span> : u.locked ? <span className="pill warn">Locked</span> : <span className="pill ok">Active</span>}
                  </td>
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

      {detail && <Detail id={detail} onClose={() => setDetail(null)} onChanged={refresh} setError={setError} />}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value === undefined ? "…" : value}</strong>
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
