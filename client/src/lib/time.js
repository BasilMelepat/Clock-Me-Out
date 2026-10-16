export const pad = (n) => String(n).padStart(2, "0");

export const fmtHMS = (s) => {
  s = Math.max(0, Math.round(s));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const fmtDur = (s) => {
  const neg = s < 0;
  s = Math.abs(Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (neg ? "-" : "") + (h ? `${h}h ${m}m` : `${m}m`);
};

export const hmToSec = (hm) => {
  if (!hm) return 0;
  const [h, m] = hm.split(":").map(Number);
  return h * 3600 + m * 60;
};

export const secToClock = (s) => {
  s = ((Math.round(s) % 86400) + 86400) % 86400;
  let h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
};

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export const nowSec = () => {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
};
export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const shiftMonth = (key, delta) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
export const toDMY = (s) => {
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
};
export const weekdayOf = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0 = Sunday
};
export const isWeekday = (dateStr) => {
  const w = weekdayOf(dateStr);
  return w > 0 && w < 6;
};

// "8h 30m 15s", "8:30", "8:30:15" or "8.5" -> seconds
export function parseDuration(str) {
  const s = String(str).trim();
  let m = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i);
  if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) return +m[1] * 3600 + +m[2] * 60 + (+m[3] || 0);
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 3600);
  return null;
}

// One entry per line: "Xh Ym Zs, Target, dd-mm-yyyy" (comma or tab separated). Target is optional.
export function parseBulk(text, defaultTargetSec) {
  const entries = [];
  let skipped = 0;
  text.split(/\r?\n/).forEach((line) => {
    const l = line.trim();
    if (!l) return;
    const parts = l.split(/\t|,/).map((p) => p.trim()).filter(Boolean);
    const dm = parts.length > 1 && parts[parts.length - 1].match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    const clockedSec = parseDuration(parts[0] || "");
    if (!dm || clockedSec == null) return void skipped++;
    const targetSec = parts.length >= 3 ? parseDuration(parts[1]) ?? defaultTargetSec : defaultTargetSec;
    entries.push({ date: `${dm[3]}-${pad(dm[2])}-${pad(dm[1])}`, clockedSec, targetSec });
  });
  return { entries, skipped };
}
