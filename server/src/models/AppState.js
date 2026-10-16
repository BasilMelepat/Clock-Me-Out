import mongoose from "mongoose";

// One document per user: the app's saved data, stored as { storageKey: jsonString }.
const appStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.models.AppState || mongoose.model("AppState", appStateSchema);
