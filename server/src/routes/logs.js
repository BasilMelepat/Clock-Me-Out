import { Router } from "express";
import DayLog from "../models/DayLog.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { cleanLog, DATE_RE, MONTH_RE } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

const FIELDS = "date clockedSec targetSec -_id";

router.get("/", wrap(async (req, res) => {
  const q = { user: req.userId };
  if (MONTH_RE.test(req.query.month || "")) q.date = new RegExp(`^${req.query.month}`);
  const logs = await DayLog.find(q).sort({ date: 1 }).select(FIELDS).lean();
  res.json({ logs });
}));

router.put("/:date", wrap(async (req, res) => {
  const entry = cleanLog({ ...req.body, date: req.params.date });
  if (!entry) return res.status(400).json({ error: "Invalid date or hours" });
  const log = await DayLog.findOneAndUpdate(
    { user: req.userId, date: entry.date },
    { $set: { clockedSec: entry.clockedSec, targetSec: entry.targetSec } },
    { upsert: true, new: true }
  ).select(FIELDS).lean();
  res.json({ log });
}));

router.post("/bulk", wrap(async (req, res) => {
  const entries = (Array.isArray(req.body?.entries) ? req.body.entries : []).slice(0, 500).map(cleanLog).filter(Boolean);
  if (!entries.length) return res.status(400).json({ error: "No valid entries to import" });
  await DayLog.bulkWrite(
    entries.map((e) => ({
      updateOne: { filter: { user: req.userId, date: e.date }, update: { $set: { clockedSec: e.clockedSec, targetSec: e.targetSec } }, upsert: true },
    }))
  );
  res.json({ saved: entries.length });
}));

router.delete("/", wrap(async (req, res) => {
  if (!MONTH_RE.test(req.query.month || "")) return res.status(400).json({ error: "month=YYYY-MM is required" });
  const r = await DayLog.deleteMany({ user: req.userId, date: new RegExp(`^${req.query.month}`) });
  res.json({ deleted: r.deletedCount });
}));

router.delete("/:date", wrap(async (req, res) => {
  if (!DATE_RE.test(req.params.date)) return res.status(400).json({ error: "Invalid date" });
  await DayLog.deleteOne({ user: req.userId, date: req.params.date });
  res.json({ ok: true });
}));

export default router;
