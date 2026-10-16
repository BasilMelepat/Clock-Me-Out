import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import AppState from "../models/AppState.js";
import LoginGuard from "../models/LoginGuard.js";
import { requireAdmin } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";

const router = Router();

const DAY = 24 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (v) => crypto.createHash("sha256").update(String(v)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- Admin sign-in: credentials live in the server's environment variables, not in the database ----
router.post("/login", wrap(async (req, res) => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || adminPassword.length < 12) {
    return res.status(503).json({ error: "Admin sign-in isn't set up yet (ADMIN_EMAIL / ADMIN_PASSWORD)." });
  }

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const key = `admin:${ip}`;
  const guard = await LoginGuard.findOne({ key }).lean();
  if (guard?.lockUntil && guard.lockUntil > new Date()) {
    return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const okEmail = safeEqual(email, adminEmail);
  const okPassword = safeEqual(password, adminPassword);

  if (!(okEmail && okPassword)) {
    const fails = (guard?.fails || 0) + 1;
    const set = { fails: fails >= MAX_FAILS ? 0 : fails, expireAt: new Date(Date.now() + 60 * 60 * 1000) };
    if (fails >= MAX_FAILS) set.lockUntil = new Date(Date.now() + LOCK_MS);
    await LoginGuard.updateOne({ key }, { $set: set }, { upsert: true });
    await sleep(600);
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  await LoginGuard.deleteOne({ key });
  const token = jwt.sign({ admin: true, email: adminEmail }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, email: adminEmail });
}));

router.use(requireAdmin);

router.get("/me", (req, res) => res.json({ email: req.adminEmail }));

// ---- Overview numbers ----
router.get("/stats", wrap(async (_req, res) => {
  const now = Date.now();
  const d7 = new Date(now - 7 * DAY);
  const d14 = new Date(now - 14 * DAY);
  const d30 = new Date(now - 30 * DAY);

  const [total, google, disabled, new7, new30, withData, active7, perDay] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ googleId: { $exists: true } }),
    User.countDocuments({ disabled: true }),
    User.countDocuments({ createdAt: { $gte: d7 } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    AppState.countDocuments({ "data.cmoLogEntries": { $exists: true } }),
    AppState.countDocuments({ updatedAt: { $gte: d7 } }),
    User.aggregate([
      { $match: { createdAt: { $gte: d14 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]),
  ]);

  const byDay = new Map(perDay.map((r) => [r._id, r.n]));
  const signups = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(now - (13 - i) * DAY).toISOString().slice(0, 10);
    return { date, n: byDay.get(date) || 0 };
  });

  res.json({ total, google, password: total - google, disabled, new7, new30, withData, active7, signups });
}));

// ---- Users ----
router.get("/users", wrap(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
  const page = Math.max(1, Number(req.query.page) || 1);
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const filter = q ? { $or: [{ email: new RegExp(escapeRegex(q), "i") }, { name: new RegExp(escapeRegex(q), "i") }] } : {};

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select("email name picture googleId disabled lockUntil createdAt").lean(),
    User.countDocuments(filter),
  ]);
  const states = await AppState.find({ user: { $in: users.map((u) => u._id) } }).select("user updatedAt").lean();
  const savedAt = new Map(states.map((s) => [String(s.user), s.updatedAt]));

  res.json({
    total,
    page,
    limit,
    users: users.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name || "",
      picture: u.picture || "",
      method: u.googleId ? "google" : "password",
      disabled: !!u.disabled,
      locked: !!(u.lockUntil && u.lockUntil > new Date()),
      createdAt: u.createdAt,
      lastSaved: savedAt.get(String(u._id)) || null,
    })),
  });
}));

const countOf = (raw) => {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === "object") return Object.keys(v).length;
    if (typeof v === "number") return v;
  } catch { /* not JSON */ }
  return null;
};

// A summary only: the admin dashboard never shows a user's actual log entries.
router.get("/users/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const user = await User.findById(req.params.id).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  const state = await AppState.findOne({ user: user._id }).lean();
  const data = state?.data || {};

  res.json({
    user: {
      id: String(user._id), email: user.email, name: user.name || "", picture: user.picture || "",
      method: user.googleId ? "google" : "password", disabled: !!user.disabled,
      locked: !!(user.lockUntil && user.lockUntil > new Date()), failedLogins: user.failedLogins || 0, createdAt: user.createdAt,
    },
    summary: state ? {
      daysLogged: countOf(data.cmoLogEntries) ?? (Number(data.cmoLogEntryCount) || null),
      holidays: countOf(data.cmoHolidays),
      absences: countOf(data.cmoAbsent),
      saves: state.version,
      lastSaved: state.updatedAt,
      bytes: Object.values(data).reduce((a, v) => a + (typeof v === "string" ? v.length : 0), 0),
    } : null,
  });
}));

router.patch("/users/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  if (typeof req.body?.disabled !== "boolean") return res.status(400).json({ error: "disabled must be true or false" });
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { disabled: req.body.disabled } }, { new: true }).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ ok: true, disabled: !!user.disabled });
}));

router.post("/users/:id/unlock", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  await User.updateOne({ _id: req.params.id }, { $set: { failedLogins: 0 }, $unset: { lockUntil: 1 } });
  res.json({ ok: true });
}));

router.delete("/users/:id", wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid user id" });
  const user = await User.findByIdAndDelete(req.params.id).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  await AppState.deleteOne({ user: user._id });
  res.json({ ok: true });
}));

export default router;
