import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ["holiday", "absent"], required: true },
});
holidaySchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);
