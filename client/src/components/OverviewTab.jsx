import MonthNav from "./MonthNav.jsx";
import { fmtDur, todayStr, weekdayOf } from "../lib/time.js";
import { workingDays } from "../lib/calc.js";

export default function OverviewTab({ shift, logs, off, month, setMonth }) {
  const ml = logs.filter((l) => l.date.startsWith(month));
  const total = ml.reduce((a, l) => a + l.clockedSec, 0);
  const balance = ml.reduce((a, l) => a + (l.clockedSec - l.targetSec), 0);
  const best = ml.reduce((a, l) => Math.max(a, l.clockedSec), 0);
  const met = ml.filter((l) => l.clockedSec >= l.targetSec).length;

  // Streak = most recent consecutive logged days that met their target (all months).
  let streak = 0;
  for (const l of [...logs].sort((a, b) => b.date.localeCompare(a.date))) {
    if (l.clockedSec >= l.targetSec) streak++;
    else break;
  }

  const dayTarget = Math.round(shift.targetHours * 3600);
  const allDays = workingDays(month, off);
  const today = todayStr();
  const leftDays = workingDays(month, off, today > `${month}-31` ? "9999" : today < `${month}-01` ? "" : today);
  const goal = allDays.length * dayTarget;
  const remaining = Math.max(0, goal - total);
  const perDay = leftDays.length ? remaining / leftDays.length : 0;
  const goalPct = goal ? Math.min(100, (total / goal) * 100) : 0;

  const names = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const pattern = names.map((n, i) => {
    const rows = ml.filter((l) => weekdayOf(l.date) === i + 1);
    return { n, avg: rows.length ? rows.reduce((a, l) => a + l.clockedSec, 0) / rows.length : 0 };
  });
  const maxAvg = Math.max(1, ...pattern.map((p) => p.avg));

  const stats = [
    ["Days logged", ml.length || "—"],
    ["Average per day", ml.length ? fmtDur(total / ml.length) : "—"],
    ["Balance", ml.length ? `${balance >= 0 ? "+" : ""}${fmtDur(balance)}` : "—", balance >= 0 ? "pos" : "neg"],
    ["Best day", best ? fmtDur(best) : "—"],
    ["Met target", ml.length ? `${met} of ${ml.length}` : "—"],
    ["Target streak", streak || "—"],
  ];

  return (
    <>
      <section className="card">
        <h2>Overview</h2>
        <MonthNav month={month} setMonth={setMonth} />
        {ml.length === 0 && <p className="muted">Log your daily hours to see your month at a glance.</p>}
        <dl className="stats">
          {stats.map(([k, v, c]) => (
            <div key={k}><dt>{k}</dt><dd className={c || ""}>{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className="card">
        <h2>Month goal</h2>
        <div className="ruler light"><span style={{ width: `${goalPct}%` }} /></div>
        <p className="big-num">{fmtDur(total)} <small>of {fmtDur(goal)}</small></p>
        <p className="muted small">
          {allDays.length} working days in the month. {leftDays.length > 0 && remaining > 0
            ? `About ${fmtDur(perDay)} a day over the ${leftDays.length} working day${leftDays.length === 1 ? "" : "s"} left.`
            : remaining === 0 ? "Goal reached." : "No working days left this month."}
        </p>
      </section>

      <section className="card">
        <h2>Weekday pattern</h2>
        <div className="bars">
          {pattern.map((p) => (
            <div className="bar" key={p.n}>
              <span className="bar-fill" style={{ height: `${(p.avg / maxAvg) * 100}%` }} />
              <small>{p.avg ? fmtDur(p.avg) : "—"}</small>
              <b>{p.n}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
