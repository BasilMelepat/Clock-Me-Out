import { Router } from "express";
import multer from "multer";
import DayLog from "../models/DayLog.js";
import Holiday from "../models/Holiday.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { parseWorkbook } from "../lib/attendance.js";

const router = Router();
router.use(requireAuth);

// Vercel functions accept ~4.5 MB request bodies, so keep the limit below that.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 5 } });

router.post("/excel", upload.array("files", 5), wrap(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "Choose at least one .xlsx file" });
  const defaultTargetSec = Math.round((Number(req.body.defaultTarget) || 8) * 3600);

  const logMap = new Map();
  const offMap = new Map();
  let name = "";
  for (const f of req.files) {
    let parsed;
    try {
      parsed = parseWorkbook(f.buffer, defaultTargetSec);
    } catch {
      return res.status(422).json({ error: `Couldn't read ${f.originalname}. Is it a valid .xlsx file?` });
    }
    parsed.logs.forEach((l) => logMap.set(l.date, l));
    parsed.holidays.forEach((h) => offMap.set(h.date, h));
    name ||= parsed.name;
  }
  if (!logMap.size && !offMap.size) {
    return res.status(422).json({ error: "No dated rows with hours were found. The sheet needs a 'Date' column and an hours column." });
  }

  if (logMap.size) {
    await DayLog.bulkWrite([...logMap.values()].map((e) => ({
      updateOne: { filter: { user: req.userId, date: e.date }, update: { $set: { clockedSec: e.clockedSec, targetSec: e.targetSec } }, upsert: true },
    })));
  }
  if (offMap.size) {
    await Holiday.bulkWrite([...offMap.values()].map((e) => ({
      updateOne: { filter: { user: req.userId, date: e.date }, update: { $set: { type: e.type } }, upsert: true },
    })));
  }
  if (name) await User.updateOne({ _id: req.userId, displayName: "" }, { $set: { displayName: name.slice(0, 60) } });

  res.json({ logs: logMap.size, holidays: offMap.size, name });
}));

export default router;
