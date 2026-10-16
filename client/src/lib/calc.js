import { hmToSec, isWeekday, pad } from "./time.js";

// Everything about "today's shift" derived from the saved shift and the current time.
export function computeShift(shift, nowS) {
  if (!shift?.clockIn) return null;
  const inS = hmToSec(shift.clockIn);
  const baseS = Math.round(shift.targetHours * 3600);
  const targetS = baseS + (shift.lateMin || 0) * 60;

  let breakS = 0;
  let onBreak = false;
  for (const b of shift.breaks || []) {
    const s = hmToSec(b.start);
    if (b.end) breakS += Math.max(0, hmToSec(b.end) - s);
    else {
      breakS += Math.max(0, nowS - s);
      onBreak = true;
    }
  }
  const elapsed = Math.max(0, nowS - inS);
  const worked = Math.max(0, elapsed - breakS);
  return {
    inS,
    baseS,
    targetS,
    breakS,
    onBreak,
    elapsed,
    worked,
    outS: inS + targetS + breakS,
    remaining: Math.max(0, targetS - worked),
    pct: targetS > 0 ? Math.min(100, (worked / targetS) * 100) : 0,
    done: targetS > 0 && worked >= targetS,
  };
}

// What happens if you leave at the planned departure time.
export function projectDeparture(shift, calc, nowS) {
  const depS = hmToSec(shift.departure);
  const projected = Math.max(0, depS - calc.inS - calc.breakS);
  return { remaining: depS - nowS, projected, diff: projected - calc.targetS };
}

export function offSet(off) {
  return new Set(off.map((o) => o.date));
}

export function monthDays(month) {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
}

export function workingDays(month, off, fromDate = "") {
  const skip = offSet(off);
  return monthDays(month).filter((d) => isWeekday(d) && !skip.has(d) && d >= fromDate);
}
