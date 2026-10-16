import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: String,
    name: String,
    picture: String,
    displayName: { type: String, default: "" },
    settings: {
      sound: { type: Boolean, default: true },
      soundStyle: { type: String, default: "chime" },
      notifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
