import { fmtDur, fmtHMS, hmToSec, nowHM, secToClock } from "../lib/time.js";
import { projectDeparture } from "../lib/calc.js";

export default function ShiftTab({ user, shift, calc, nowS, updateShift, clearShift }) {
  const name = user.displayName || user.name?.split(" ")[0] || "there";
  const dep = shift.departure && calc ? projectDeparture(shift, calc, nowS) : null;
  const openBreak = shift.breaks.findIndex((b) => !b.end);

  const setBreak = (i, patch) => updateShift({ breaks: shift.breaks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  return (
    <>
      <section className="card">
        <h2>Shift details</h2>
        {!shift.clockIn && <p className="muted">Hello {name} 👋 Add your clock-in time to begin the day.</p>}
        <div className="row">
          <label>
            Clock-in time
            <input type="time" value={shift.clockIn} onChange={(e) => updateShift({ clockIn: e.target.value })} />
          </label>
          <label>
            Target hours
            <input type="number" min="1" max="16" step="0.25" value={shift.targetHours} onChange={(e) => updateShift({ targetHours: Number(e.target.value) || 0 })} />
          </label>
        </div>
        {!shift.clockIn && <button className="btn" onClick={() => updateShift({ clockIn: nowHM() })}>Clock in now</button>}

        <h3>Breaks</h3>
        {shift.breaks.length === 0 && <p className="muted small">No breaks yet.</p>}
        {shift.breaks.map((b, i) => (
          <div className="row break" key={i}>
            <label>Out<input type="time" value={b.start} onChange={(e) => setBreak(i, { start: e.target.value })} /></label>
            <label>In<input type="time" value={b.end || ""} onChange={(e) => setBreak(i, { end: e.target.value })} /></label>
            <button className="icon" aria-label="Remove break" onClick={() => updateShift({ breaks: shift.breaks.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <div className="actions">
          {openBreak < 0 ? (
            <button className="btn ghost" disabled={!shift.clockIn} onClick={() => updateShift({ breaks: [...shift.breaks, { start: nowHM(), end: "" }] })}>Start break</button>
          ) : (
            <button className="btn" onClick={() => setBreak(openBreak, { end: nowHM() })}>End break</button>
          )}
          <button className="btn ghost danger" onClick={clearShift}>Clear all</button>
        </div>
      </section>

      {calc ? (
        <>
          <section className="slab" aria-live="polite">
            <p className="slab-label">Clock out at</p>
            <p className="slab-time">{secToClock(calc.outS)}</p>
            <div className="ruler" role="progressbar" aria-valuenow={Math.round(calc.pct)} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${calc.pct}%` }} />
            </div>
            <p className="slab-status">
              {calc.done ? "Target reached. You can clock out." : calc.onBreak ? "On break · timer paused" : `${fmtDur(calc.remaining)} to go`}
            </p>
            <dl className="slab-stats">
              <div><dt>Worked</dt><dd>{fmtHMS(calc.worked)}</dd></div>
              <div><dt>Breaks</dt><dd>{fmtDur(calc.breakS)}</dd></div>
              <div><dt>Elapsed</dt><dd>{fmtHMS(calc.elapsed)}</dd></div>
            </dl>
            <p className="slab-now">Now {fmtHMS(nowS)}</p>
          </section>

          <section className="card">
            <h2>Running late balance</h2>
            <label>
              Minutes behind
              <input type="number" min="0" step="1" value={shift.lateMin || ""} placeholder="0" onChange={(e) => updateShift({ lateMin: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </label>
            <p className="muted small">
              {shift.lateMin > 0
                ? `Today's adjusted target is ${fmtDur(calc.targetS)} (${shift.lateMin} min extra).`
                : "Enter minutes you owe from earlier days to see today's adjusted target."}
            </p>
          </section>

          <section className="card">
            <h2>Departure planner</h2>
            <label>
              Planned departure
              <input type="time" value={shift.departure} onChange={(e) => updateShift({ departure: e.target.value })} />
            </label>
            {dep ? (
              <>
                <p className="big-num">{dep.remaining > 0 ? fmtHMS(dep.remaining) : "Time passed"}</p>
                <p className="muted small">
                  {dep.diff >= 0
                    ? `Leaving at ${secToClock(hmToSec(shift.departure))} puts you ${fmtDur(dep.diff)} ahead of today's target.`
                    : `Leaving at ${secToClock(hmToSec(shift.departure))} leaves you ${fmtDur(-dep.diff)} short. Add it to your running late balance in the Log tab.`}
                </p>
              </>
            ) : (
              <p className="muted small">Set a departure time to see the impact on your hours.</p>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
