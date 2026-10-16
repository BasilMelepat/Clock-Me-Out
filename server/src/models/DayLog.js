import mongoose from "mongoose";

const dayLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  clockedSec: { type: Number, required: true },
  targetSec: { type: Number, required: true },
});
dayLogSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.DayLog || mongoose.model("DayLog", dayLogSchema);
