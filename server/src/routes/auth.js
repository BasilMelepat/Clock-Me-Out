import { Router } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;
const dummyHash = hashPassword("not-a-real-password"); // keeps response time similar for unknown emails

const cleanEmail = (v) => (typeof v === "string" ? v.trim().toLowerCase() : "");
const publicUser = (u) => ({ id: String(u._id), email: u.email, name: u.name, picture: u.picture });
const session = (u) => ({
  token: jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "30d" }),
  user: publicUser(u),
});

// ---- Email + password ----
router.post("/register", wrap(async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 60) : "";

  if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ error: "Enter a valid email address" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (password.length > 128) return res.status(400).json({ error: "Password is too long (max 128 characters)" });

  const taken = (existing) =>
    res.status(409).json({
      error: existing?.googleId && !existing?.passwordHash
        ? "This email already uses Google sign-in. Use the Google button."
        : "An account with this email already exists. Sign in instead.",
    });

  const existing = await User.findOne({ email }).select("+passwordHash");
  if (existing) return taken(existing);

  let user;
  try {
    user = await User.create({ email, name: name || email.split("@")[0], passwordHash: await hashPassword(password) });
  } catch (e) {
    if (e.code === 11000) return taken(null);
    throw e;
  }
  res.status(201).json(session(user));
}));

router.post("/login", wrap(async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ error: "Enter your email and password" });

  const user = await User.findOne({ email }).select("+passwordHash");

  if (user?.lockUntil && user.lockUntil > new Date()) {
    return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }
  if (user && !user.passwordHash) {
    return res.status(400).json({ error: "This account uses Google sign-in. Use the Google button." });
  }

  const ok = await verifyPassword(password, user ? user.passwordHash : await dummyHash);
  if (!user || !ok) {
    if (user) {
      const fails = (user.failedLogins || 0) + 1;
      await User.updateOne(
        { _id: user._id },
        { $set: fails >= MAX_FAILS ? { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails } }
      );
    }
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  if (user.disabled) return res.status(403).json({ error: "This account has been disabled." });

  if (user.failedLogins || user.lockUntil) {
    await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0 }, $unset: { lockUntil: 1 } });
  }
  res.json(session(user));
}));

// ---- Google ----
router.post("/google", wrap(async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: "Missing Google credential" });

  let payload;
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Google sign-in could not be verified" });
  }
  if (!payload?.sub) return res.status(401).json({ error: "Google sign-in could not be verified" });

  let user = await User.findOne({ googleId: payload.sub });
  if (user?.disabled) return res.status(403).json({ error: "This account has been disabled." });
  if (user) {
    user.name = payload.name || user.name;
    user.picture = payload.picture || user.picture;
    await user.save();
  } else {
    const email = cleanEmail(payload.email);
    if (!email) return res.status(400).json({ error: "Your Google account didn't share an email address" });
    // One account per email: don't silently merge with a password account.
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "This email is registered with a password. Sign in with your email and password instead." });
    }
    user = await User.create({ googleId: payload.sub, email, name: payload.name, picture: payload.picture });
  }
  res.json(session(user));
}));

router.get("/me", requireAuth, wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: "Account not found" });
  res.json({ user: publicUser(user) });
}));

export default router;
