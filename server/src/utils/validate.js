// The only keys the app is allowed to sync (they match the original app's backup keys).
export const STATE_KEYS = ["cmoLogEntries", "cmoLogEntryCount", "cmoShiftState", "cmoHolidays", "cmoAbsent", "cmoPay", "cmoUserName"];
const MAX_BYTES = 1_500_000;

export function cleanState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out = {};
  let size = 0;
  for (const key of STATE_KEYS) {
    const v = input[key];
    if (typeof v !== "string") continue;
    size += v.length;
    if (size > MAX_BYTES) return null;
    out[key] = v;
  }
  return out;
}
