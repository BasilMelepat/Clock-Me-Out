import { Router } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { wrap } from "../utils/wrap.js";

const router = Router();

const publicUser = (u) => ({ id: String(u._id), email: u.email, name: u.name, picture: u.picture });

// Exchange a Google ID token for our own session token.
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

  const user = await User.findOneAndUpdate(
    { googleId: payload.sub },
    { $set: { email: payload.email, name: payload.name, picture: payload.picture } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
}));

router.get("/me", requireAuth, wrap(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: "Account not found" });
  res.json({ user: publicUser(user) });
}));

export default router;
