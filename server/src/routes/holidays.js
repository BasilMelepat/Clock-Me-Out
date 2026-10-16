import { Router } from "express";
import Holiday from "../models/Holiday.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { cleanOff, DATE_RE, MONTH_RE } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

const FIELDS = "date type -_id";

router.get("/", wrap(async (req, res) => {
  const holidays = await Holiday.find({ user: req.userId }).sort({ date: 1 }).select(FIELDS).lean();
  res.json({ holidays });
}));

router.put("/:date", wrap(async (req, res) => {
  const entry = cleanOff({ date: req.params.date, type: req.body?.type });
  if (!entry) return res.status(400).json({ error: "Invalid date or type" });
  const holiday = await Holiday.findOneAndUpdate(
    { user: req.userId, date: entry.date },
    { $set: { type: entry.type } },
    { upsert: true, new: true }
  ).select(FIELDS).lean();
  res.json({ holiday });
}));

router.delete("/", wrap(async (req, res) => {
  if (!MONTH_RE.test(req.query.month || "")) return res.status(400).json({ error: "month=YYYY-MM is required" });
  await Holiday.deleteMany({ user: req.userId, date: new RegExp(`^${req.query.month}`) });
  res.json({ ok: true });
}));

router.delete("/:date", wrap(async (req, res) => {
  if (!DATE_RE.test(req.params.date)) return res.status(400).json({ error: "Invalid date" });
  await Holiday.deleteOne({ user: req.userId, date: req.params.date });
  res.json({ ok: true });
}));

export default router;
