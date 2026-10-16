import jwt from "jsonwebtoken";
import User from "../models/User.js";

const bearer = (req) => {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
};

// Regular users. Admin tokens have no user id, so they can't be used here.
export async function requireAuth(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Please sign in" });

  let id;
  try {
    id = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return res.status(401).json({ error: "Your session expired. Please sign in again." });
  }
  if (!id) return res.status(401).json({ error: "Please sign in" });

  try {
    const user = await User.findById(id).select("disabled").lean();
    if (!user) return res.status(401).json({ error: "Account not found" });
    if (user.disabled) return res.status(403).json({ error: "This account has been disabled." });
    req.userId = id;
    next();
  } catch (e) {
    next(e);
  }
}

// Admin only: the token must carry admin: true (issued by POST /api/admin/login).
export function requireAdmin(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Admin sign-in required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.admin !== true) throw new Error("not admin");
    req.adminEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Admin session expired. Please sign in again." });
  }
}
