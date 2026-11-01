import { Router } from "express";
import AppState from "../models/AppState.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { cleanState } from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

// data is null until the user has saved something at least once.
router.get("/", wrap(async (req, res) => {
  res.set("Cache-Control", "no-store"); // always read the live copy
  const doc = await AppState.findOne({ user: req.userId }).lean();
  res.json({ data: doc ? doc.data : null, version: doc ? doc.version : 0, updatedAt: doc?.updatedAt || null });
}));

router.put("/", wrap(async (req, res) => {
  const data = cleanState(req.body?.data);
  if (!data) return res.status(400).json({ error: "Invalid or too large data" });
  const doc = await AppState.findOneAndUpdate(
    { user: req.userId },
    { $set: { data }, $inc: { version: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  res.json({ version: doc.version, updatedAt: doc.updatedAt });
}));

export default router;
