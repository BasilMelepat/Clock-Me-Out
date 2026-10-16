// Best-effort parser for attendance sheets (.xlsx).
// It looks for a header row containing "Date", then finds the hours / target / status columns by name.
import XLSX from "xlsx";

const pad = (n) => String(n).padStart(2, "0");
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const VALID = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parseDate(v) {
  let out = null;
  if (v instanceof Date && !isNaN(v)) {
    const x = new Date(v.getTime() + 12 * 3600e3); // absorb small timezone drift
    out = `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
  } else if (typeof v === "number" && v > 20000 && v < 80000) {
    const c = XLSX.SSF.parse_date_code(v);
    if (c) out = `${c.y}-${pad(c.m)}-${pad(c.d)}`;
  } else if (typeof v === "string") {
    const s = v.trim();
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) out = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) out = `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
    else if ((m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s,-]+(\d{2,4})/)) && MONTHS[m[2].toLowerCase()])
      out = `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  }
  return out && VALID.test(out) ? out : null;
}

function parseDur(v) {
  if (v === "" || v == null) return null;
  if (v instanceof Date && !isNaN(v)) {
    const s = v.getUTCHours() * 3600 + v.getUTCMinutes() * 60 + v.getUTCSeconds();
    return Math.round(s / 60) * 60;
  }
  if (typeof v === "number") return v < 1 ? Math.round(v * 86400) : Math.round(v * 3600); // fraction of a day, or decimal hours
  const s = String(v).trim();
  let m = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i);
  if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) return +m[1] * 3600 + +m[2] * 60 + (+m[3] || 0);
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 3600);
  return null;
}

export function parseWorkbook(buffer, defaultTargetSec) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const logs = [];
  const holidays = [];
  let name = "";

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });

    if (!name) {
      for (const r of rows.slice(0, 15)) {
        for (let i = 0; i < r.length - 1; i++) {
          if (typeof r[i] === "string" && /^(employee\s*)?name\s*:?$/i.test(r[i].trim()) && String(r[i + 1]).trim()) {
            name = String(r[i + 1]).trim();
            break;
          }
        }
        if (name) break;
      }
    }

    const hi = rows.findIndex((r, idx) => idx < 25 && r.some((c) => typeof c === "string" && /^date/i.test(c.trim())));
    if (hi < 0) continue;
    const head = rows[hi].map((c) => String(c).trim().toLowerCase());
    const find = (re) => head.findIndex((h) => re.test(h));
    const dCol = find(/^date/);
    let wCol = find(/effective|worked|work\s*hrs|total\s*(hours|hrs|time)|duration|^hours|working/);
    if (wCol < 0) wCol = find(/total|hours|hrs/);
    const tCol = find(/target|required|expected|shift\s*hours/);
    const sCol = find(/status|remark|attendance/);

    for (const r of rows.slice(hi + 1)) {
      const date = parseDate(r[dCol]);
      if (!date) continue;
      const status = sCol >= 0 ? String(r[sCol]).toLowerCase() : "";
      if (/holiday/.test(status)) { holidays.push({ date, type: "holiday" }); continue; }
      if (/absent|leave/.test(status)) { holidays.push({ date, type: "absent" }); continue; }
      const dur = wCol >= 0 ? parseDur(r[wCol]) : null;
      if (!dur) continue;
      const target = tCol >= 0 ? parseDur(r[tCol]) || defaultTargetSec : defaultTargetSec;
      logs.push({ date, clockedSec: Math.min(dur, 86400), targetSec: Math.min(target, 86400) });
    }
  }
  return { logs, holidays, name };
}
