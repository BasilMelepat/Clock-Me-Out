import { useState } from "react";
import { api } from "../api.js";
import { notify, playSound } from "../lib/sound.js";

const STYLES = [["chime", "Chime"], ["marimba", "Marimba"], ["bell", "Loud bell"]];

export default function SettingsTab({ user, actions, toast, logout }) {
  const [name, setName] = useState(user.displayName || "");
  const s = user.settings;
  const setS = (patch) => actions.saveProfile({ settings: { ...s, ...patch } });

  const toggleNotifications = async (on) => {
    if (on) {
      if (!("Notification" in window)) return toast("This browser doesn't support notifications");
      const p = await Notification.requestPermission();
      if (p !== "granted") return toast("Notifications are blocked in your browser settings");
    }
    setS({ notifications: on });
  };

  const download = async () => {
    const data = await api.get("/data/backup");
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `clock-me-out-backup-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("Restoring replaces your current logs, holidays and shift. Continue?")) return;
    let json;
    try { json = JSON.parse(await file.text()); } catch { return toast("That file isn't valid JSON"); }
    const r = await actions.restore(json);
    if (r) toast(`Restored ${r.logs} days`);
  };

  return (
    <>
      <section className="card">
        <h2>Account</h2>
        <div className="account">
          {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
          <div><strong>{user.name}</strong><p className="muted small">{user.email}</p></div>
        </div>
        <label>
          Display name
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={user.name} />
        </label>
        <div className="actions">
          <button className="btn" onClick={async () => { await actions.saveProfile({ displayName: name }); toast("Name saved"); }}>Save</button>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </section>

      <section className="card">
        <h2>Sound</h2>
        <label className="switch"><input type="checkbox" checked={s.sound} onChange={(e) => setS({ sound: e.target.checked })} /> Sound effects</label>
        <div className="seg wide">
          {STYLES.map(([id, label]) => (
            <button key={id} aria-selected={s.soundStyle === id} onClick={() => { setS({ soundStyle: id }); playSound(id); }}>{label}</button>
          ))}
        </div>
        <p className="muted small">Plays when you reach your target, cover your backlog, or hit your planned departure. Works while this page stays open.</p>
      </section>

      <section className="card">
        <h2>Notifications</h2>
        <label className="switch"><input type="checkbox" checked={s.notifications} onChange={(e) => toggleNotifications(e.target.checked)} /> Browser notifications</label>
        <button className="btn ghost" onClick={() => notify({ ...s, notifications: true }, "This is a test notification.")}>Send a test</button>
      </section>

      <section className="card">
        <h2>Backup</h2>
        <div className="actions">
          <button className="btn" onClick={download}>Download backup</button>
          <label className="btn ghost filebtn">Restore backup<input type="file" accept="application/json,.json" hidden onChange={restore} /></label>
        </div>
        <p className="muted small">Saves your logs, shift, holidays, absences and name to a file. Restoring replaces what's saved now.</p>
      </section>

      <section className="card">
        <h2>Reset</h2>
        <p className="muted small">Deletes every log, holiday, absence and your shift from your account. This can't be undone.</p>
        <button className="btn danger" onClick={() => window.confirm("Delete everything saved in your account? This can't be undone.") && actions.flush()}>Delete all my data</button>
      </section>
    </>
  );
}
