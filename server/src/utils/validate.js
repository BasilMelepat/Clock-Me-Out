export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const time = (v) => (typeof v === "string" && TIME_RE.test(v) ? v : "");

export function cleanShift(b = {}) {
  return {
    date: DATE_RE.test(b.date) ? b.date : "",
    clockIn: time(b.clockIn),
    targetHours: clamp(Number(b.targetHours) || 0, 0, 24),
    breaks: (Array.isArray(b.breaks) ? b.breaks : [])
      .slice(0, 30)
      .map((x) => ({ start: time(x?.start), end: time(x?.end) }))
      .filter((x) => x.start),
    lateMin: clamp(Math.round(Number(b.lateMin) || 0), 0, 100000),
    departure: time(b.departure),
  };
}

export function cleanLog(e = {}) {
  if (!DATE_RE.test(e.date)) return null;
  const clockedSec = Math.round(Number(e.clockedSec));
  const targetSec = Math.round(Number(e.targetSec));
  if (!Number.isFinite(clockedSec) || !Number.isFinite(targetSec)) return null;
  return { date: e.date, clockedSec: clamp(clockedSec, 0, 86400), targetSec: clamp(targetSec, 0, 86400) };
}

export function cleanOff(e = {}) {
  if (!DATE_RE.test(e.date) || !["holiday", "absent"].includes(e.type)) return null;
  return { date: e.date, type: e.type };
}

export const SOUND_STYLES = ["chime", "marimba", "bell"];
