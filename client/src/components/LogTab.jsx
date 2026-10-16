import { useMemo, useState } from "react";
import MonthNav from "./MonthNav.jsx";
import { fmtDur, pad, parseBulk, todayStr, toDMY } from "../lib/time.js";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function LogTab({ shift, calc, logs, off, month, setMonth, actions, toast, goShift }) {
  const [view, setView] = useState("calendar");
  const [date, setDate] = useState(todayStr());
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [tgt, setTgt] = useState(shift.targetHours);
  const [bulk, setBulk] = useState("");
  const [offDate, setOffDate] = useState(todayStr());
  const [offType, setOffType] = useState("holiday");

  const logMap = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  const offMap = useMemo(() => new Map(off.map((o) => [o.date, o.type])), [off]);
  const monthLogs = logs.filter((l) => l.date.startsWith(month));
  const monthOff = off.filter((o) => o.date.startsWith(month));

  const pick = (d) => {
    setDate(d);
    const l = logMap.get(d);
    if (l) {
      setH(Math.floor(l.clockedSec / 3600));
      setM(Math.floor((l.clockedSec % 3600) / 60));
      setTgt(l.targetSec / 3600);
    } else {
      setH("");
      setM("");
    }
  };

  const save = async () => {
    const secs = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60;
    if (!secs) return toast("Enter the hours you clocked");
    await actions.saveLog(date, secs, Math.round((Number(tgt) || 0) * 3600));
    toast(`Saved ${toDMY(date)}`);
  };

  const fillFromToday = () => {
    if (!calc) return toast("Clock in on the Shift tab first");
    setDate(todayStr());
    setH(Math.floor(calc.worked / 3600));
    setM(Math.floor((calc.worked % 3600) / 60));
    setTgt(shift.targetHours);
  };

  const [y, mo] = month.split("-").map(Number);
  const lead = new Date(y, mo - 1, 1).getDay();
  const dim = new Date(y, mo, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  const copyLog = async () => {
    if (!monthLogs.length) return toast("Nothing to copy for this month");
    const text = monthLogs.map((l) => `${toDMY(l.date)}, ${fmtDur(l.clockedSec)}, target ${fmtDur(l.targetSec)}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("Log copied");
    } catch {
      toast("Couldn't copy. Allow clipboard access.");
    }
  };

  const runBulk = async () => {
    const { entries, skipped } = parseBulk(bulk, Math.round(shift.targetHours * 3600));
    if (!entries.length) return toast("No valid lines found. Use: 8h 30m, 8h, 25-09-2026");
    await actions.bulkSave(entries);
    setBulk("");
    toast(`Imported ${entries.length} day${entries.length === 1 ? "" : "s"}${skipped ? `, skipped ${skipped}` : ""}`);
  };

  const runExcel = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    const r = await actions.importExcel(files, shift.targetHours);
    if (r) toast(`Imported ${r.logs} days and ${r.holidays} holidays/absences`);
  };

  return (
    <>
      <section className="card">
        <h2>Add a day</h2>
        <div className="row">
          <label>Date<input type="date" value={date} onChange={(e) => pick(e.target.value)} /></label>
          <label>Target hrs<input type="number" min="0" step="0.25" value={tgt} onChange={(e) => setTgt(e.target.value)} /></label>
        </div>
        <div className="row">
          <label>Hours<input type="number" min="0" max="24" value={h} onChange={(e) => setH(e.target.value)} placeholder="0" /></label>
          <label>Minutes<input type="number" min="0" max="59" value={m} onChange={(e) => setM(e.target.value)} placeholder="0" /></label>
        </div>
        <div className="actions">
          <button className="btn" onClick={save}>{logMap.has(date) ? "Update day" : "Add day"}</button>
          <button className="btn ghost" onClick={fillFromToday}>Use today's shift</button>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Daily log</h2>
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={view === "calendar"} onClick={() => setView("calendar")}>Calendar</button>
            <button role="tab" aria-selected={view === "table"} onClick={() => setView("table")}>Table</button>
          </div>
        </div>
        <MonthNav month={month} setMonth={setMonth} />

        {view === "calendar" ? (
          <>
            <div className="cal">
              {WEEK.map((d) => <span className="cal-h" key={d}>{d}</span>)}
              {cells.map((d, i) => {
                if (!d) return <span key={`b${i}`} />;
                const ds = `${month}-${pad(d)}`;
                const type = offMap.get(ds);
                const log = logMap.get(ds);
                const cls = type || (log ? (log.clockedSec >= log.targetSec ? "ok" : "short") : "none");
                return (
                  <button key={ds} className={`cal-d ${cls} ${ds === todayStr() ? "today" : ""} ${ds === date ? "sel" : ""}`} onClick={() => pick(ds)} aria-label={ds}>
                    <b>{d}</b>
                    {log && !type && <small>{Math.floor(log.clockedSec / 3600)}:{pad(Math.floor((log.clockedSec % 3600) / 60))}</small>}
                  </button>
                );
              })}
            </div>
            <ul className="legend">
              <li className="ok">On target</li><li className="short">Short</li><li className="none">No entry</li><li className="holiday">Holiday</li><li className="absent">Absent</li>
            </ul>
          </>
        ) : monthLogs.length === 0 ? (
          <p className="muted">No days logged this month.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Day</th><th>Clocked</th><th>Target</th><th /></tr></thead>
            <tbody>
              {monthLogs.map((l) => (
                <tr key={l.date}>
                  <td>{toDMY(l.date)}</td>
                  <td className={l.clockedSec >= l.targetSec ? "pos" : "neg"}>{fmtDur(l.clockedSec)}</td>
                  <td>{fmtDur(l.targetSec)}</td>
                  <td><button className="icon" aria-label={`Delete ${l.date}`} onClick={() => actions.deleteLog(l.date)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="actions">
          <button className="btn ghost" onClick={copyLog}>Copy log</button>
          <button className="btn ghost" onClick={() => { actions.syncBalance(month); toast("Running late balance updated"); }}>Sync to running late</button>
          <button className="btn ghost" onClick={goShift}>Plan early departure</button>
        </div>
      </section>

      <section className="card">
        <h2>Holidays and absences</h2>
        <p className="muted small">These days aren't counted as working days in your month goal.</p>
        <div className="row">
          <label>Date<input type="date" value={offDate} onChange={(e) => setOffDate(e.target.value)} /></label>
          <label>Type
            <select value={offType} onChange={(e) => setOffType(e.target.value)}>
              <option value="holiday">Holiday</option>
              <option value="absent">Absent</option>
            </select>
          </label>
        </div>
        <button className="btn" onClick={() => offDate && actions.saveOff(offDate, offType)}>Add</button>
        {monthOff.length > 0 && (
          <ul className="chips">
            {monthOff.map((o) => (
              <li key={o.date} className={o.type}>
                {toDMY(o.date)} · {o.type}
                <button aria-label={`Remove ${o.date}`} onClick={() => actions.deleteOff(o.date)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Bulk import</h2>
        <label>
          Attendance sheets (.xlsx)
          <input type="file" accept=".xlsx,.xls" multiple onChange={runExcel} />
        </label>
        <p className="muted small">The sheet needs a Date column and an hours column. Your name is picked up automatically if it's in the header.</p>
        <label>
          Or paste lines
          <textarea rows="4" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"8h 30m 0s, 8h, 25-09-2026\n7h 45m, 26-09-2026"} />
        </label>
        <p className="muted small">One entry per line: <code>Xh Ym Zs, Target, dd-mm-yyyy</code>. Target is optional.</p>
        <div className="actions">
          <button className="btn" onClick={runBulk} disabled={!bulk.trim()}>Import</button>
          {monthLogs.length > 0 && (
            <button className="btn ghost danger" onClick={() => window.confirm(`Delete all logged days in ${month}?`) && actions.clearMonthLogs(month)}>Clear month's log</button>
          )}
        </div>
      </section>
    </>
  );
}
