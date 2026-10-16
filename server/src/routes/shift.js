import { Router } from "express";
import Shift from "../models/Shift.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { cleanShift } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

const view = (s) => s && { date: s.date, clockIn: s.clockIn, targetHours: s.targetHours, breaks: s.breaks, lateMin: s.lateMin, departure: s.departure };

router.get("/", wrap(async (req, res) => {
  const shift = await Shift.findOne({ user: req.userId }).lean();
  res.json({ shift: view(shift) || null });
}));

router.put("/", wrap(async (req, res) => {
  const data = cleanShift(req.body);
  const shift = await Shift.findOneAndUpdate({ user: req.userId }, { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  res.json({ shift: view(shift) });
}));

router.delete("/", wrap(async (req, res) => {
  await Shift.deleteOne({ user: req.userId });
  res.json({ ok: true });
}));

export default router;
