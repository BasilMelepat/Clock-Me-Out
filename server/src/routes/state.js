import { Router } from "express";
import mongoose from "mongoose";
import AppState from "../models/AppState.js";
import StateHistory from "../models/StateHistory.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { cleanState } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); }); // always the live copy

const KEEP = 40; // versions kept per user
const COALESCE_MS = 30 * 60 * 1000; // ordinary saves: at most one history entry per 30 minutes

const parseList = (raw) => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; } };
const countDays = (data) => parseList(data?.cmoLogEntries).length;

// Keep the data that is about to be replaced. Always when it is a deliberate overwrite or the new copy has fewer days.
async function remember(prev, always) {
  if (!prev) return;
  const last = await StateHistory.findOne({ user: prev.user }).sort({ createdAt: -1 }).select("createdAt").lean();
  if (!always && last && Date.now() - new Date(last.createdAt).getTime() < COALESCE_MS) return;
  await StateHistory.create({ user: prev.user, version: prev.version, savedAt: prev.updatedAt || new Date(), data: prev.data });
  const extra = await StateHistory.find({ user: prev.user }).sort({ savedAt: -1 }).skip(KEEP).select("_id").lean();
  if (extra.length) await StateHistory.deleteMany({ _id: { $in: extra.map((e) => e._id) } });
}

// data is null until the user has saved something at least once.
router.get("/", wrap(async (req, res) => {
  const doc = await AppState.findOne({ user: req.userId }).lean();
  res.json({ data: doc ? doc.data : null, version: doc ? doc.version : 0, updatedAt: doc?.updatedAt || null });
}));

// Saving needs baseVersion: the version the client's copy was based on. If someone else saved in the meantime the save is
// refused (409) and nothing is overwritten. { force: true } is for a deliberate "replace the cloud copy".
router.put("/", wrap(async (req, res) => {
  const data = cleanState(req.body?.data);
  if (!data) return res.status(400).json({ error: "Invalid or too large data" });
  const force = req.body?.force === true;
  const base = req.body?.baseVersion;
  if (!Number.isInteger(base)) {
    return res.status(409).json({ error: "This version of the app is out of date. Reload the page to update it.", code: "outdated" });
  }

  const conflict = async () => {
    const cur = await AppState.findOne({ user: req.userId }).lean();
    return res.status(409).json({ error: "The cloud copy changed since this copy was loaded", code: "conflict", version: cur?.version || 0, data: cur?.data || null });
  };

  let prev;
  try {
    prev = await AppState.findOneAndUpdate(
      force ? { user: req.userId } : { user: req.userId, version: base },
      { $set: { data }, $inc: { version: 1 } },
      { upsert: true, new: false, setDefaultsOnInsert: true } // returns the copy that was replaced
    ).lean();
  } catch (e) {
    if (e.code === 11000) return conflict(); // a copy exists, but not at the version the client expected
    throw e;
  }
  if (prev && JSON.stringify(prev.data) !== JSON.stringify(data)) await remember(prev, force || countDays(data) < countDays(prev.data));
  res.json({ version: (prev?.version || 0) + 1 });
}));

router.get("/history", wrap(async (req, res) => {
  const rows = await StateHistory.find({ user: req.userId }).sort({ savedAt: -1 }).limit(KEEP).select("savedAt version data.cmoLogEntries").lean();
  res.json({ items: rows.map((r) => ({ id: String(r._id), savedAt: r.savedAt, version: r.version, days: countDays(r.data) })) });
}));

// Put an earlier version back. The copy it replaces goes into the history too.
router.post("/restore", wrap(async (req, res) => {
  const id = req.body?.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid version" });
  const snap = await StateHistory.findOne({ _id: id, user: req.userId }).lean();
  if (!snap) return res.status(404).json({ error: "That version is no longer available" });
  const prev = await AppState.findOneAndUpdate(
    { user: req.userId },
    { $set: { data: snap.data }, $inc: { version: 1 } },
    { upsert: true, new: false, setDefaultsOnInsert: true }
  ).lean();
  await remember(prev, true);
  res.json({ data: snap.data, version: (prev?.version || 0) + 1 });
}));

export default router;
