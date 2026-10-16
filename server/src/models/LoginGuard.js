import mongoose from "mongoose";

// Failed admin-login counter per IP address. Documents expire on their own (TTL index).
const guardSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  fails: { type: Number, default: 0 },
  lockUntil: Date,
  expireAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.models.LoginGuard || mongoose.model("LoginGuard", guardSchema);
