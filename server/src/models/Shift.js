import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    date: { type: String, default: "" }, // YYYY-MM-DD the shift belongs to
    clockIn: { type: String, default: "" }, // HH:MM
    targetHours: { type: Number, default: 8 },
    breaks: [{ _id: false, start: String, end: { type: String, default: "" } }],
    lateMin: { type: Number, default: 0 }, // running-late balance in minutes
    departure: { type: String, default: "" }, // planned departure HH:MM
  },
  { timestamps: true }
);

export default mongoose.models.Shift || mongoose.model("Shift", shiftSchema);
