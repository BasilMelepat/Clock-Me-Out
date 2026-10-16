import { Router } from "express";
import User from "../models/User.js";
import Shift from "../models/Shift.js";
import DayLog from "../models/DayLog.js";
import Holiday from "../models/Holiday.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { cleanLog, cleanOff, cleanShift, SOUND_STYLES } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

router.get("/backup", wrap(async (req, res) => {
  const [user, shift, logs, holidays] = await Promise.all([
    User.findById(req.userId).lean(),
    Shift.findOne({ user: req.userId }).lean(),
    DayLog.find({ user: req.userId }).sort({ date: 1 }).select("date clockedSec targetSec -_id").lean(),
    Holiday.find({ user: req.userId }).sort({ date: 1 }).select("date type -_id").lean(),
  ]);
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: { displayName: user?.displayName || "", settings: user?.settings || {} },
    shift: shift ? cleanShift(shift) : null,
    logs,
    holidays,
  });
}));

// Restoring replaces logs, holidays and the current shift.
router.post("/restore", wrap(async (req, res) => {
  const b = req.body || {};
  if (b.version !== 1 || !Array.isArray(b.logs) || !Array.isArray(b.holidays)) {
    return res.status(400).json({ error: "This doesn't look like a Clock me Out backup file" });
  }
  const logs = b.logs.slice(0, 5000).map(cleanLog).filter(Boolean);
  const holidays = b.holidays.slice(0, 2000).map(cleanOff).filter(Boolean);

  await Promise.all([DayLog.deleteMany({ user: req.userId }), Holiday.deleteMany({ user: req.userId }), Shift.deleteOne({ user: req.userId })]);
  if (logs.length) await DayLog.insertMany(logs.map((l) => ({ ...l, user: req.userId })), { ordered: false }).catch(() => {});
  if (holidays.length) await Holiday.insertMany(holidays.map((h) => ({ ...h, user: req.userId })), { ordered: false }).catch(() => {});
  if (b.shift) await Shift.create({ ...cleanShift(b.shift), user: req.userId });

  const set = {};
  if (typeof b.profile?.displayName === "string") set.displayName = b.profile.displayName.slice(0, 60);
  const s = b.profile?.settings || {};
  if (typeof s.sound === "boolean") set["settings.sound"] = s.sound;
  if (typeof s.notifications === "boolean") set["settings.notifications"] = s.notifications;
  if (SOUND_STYLES.includes(s.soundStyle)) set["settings.soundStyle"] = s.soundStyle;
  if (Object.keys(set).length) await User.updateOne({ _id: req.userId }, { $set: set });

  res.json({ logs: logs.length, holidays: holidays.length });
}));

// "Flush everything": wipes logs, holidays and shift but keeps the account.
router.delete("/", wrap(async (req, res) => {
  await Promise.all([DayLog.deleteMany({ user: req.userId }), Holiday.deleteMany({ user: req.userId }), Shift.deleteOne({ user: req.userId })]);
  await User.updateOne({ _id: req.userId }, { $set: { displayName: "" } });
  res.json({ ok: true });
}));

export default router;
