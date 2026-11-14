import mongoose from "mongoose";

// Earlier versions of a user's saved data. Written just before the data is replaced, so a mistake can be undone.
const historySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: Number, // the version number this data had
    savedAt: Date, // when this data was last saved
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);
historySchema.index({ user: 1, savedAt: -1 });

export default mongoose.models.StateHistory || mongoose.model("StateHistory", historySchema);
