import mongoose from "mongoose";
import User from "./models/User.js";
import AppState from "./models/AppState.js";
import LoginGuard from "./models/LoginGuard.js";

// Cache the connection so serverless invocations reuse it.
const cached = globalThis._cmoMongoose || (globalThis._cmoMongoose = { conn: null, promise: null, indexes: null });

export async function connectDB() {
  if (!cached.conn) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    cached.promise ||= mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
    cached.conn = await cached.promise;
  }
  // Keeps indexes in line with the schemas (for example googleId must be a sparse unique index so password accounts can exist).
  cached.indexes ||= Promise.all([User.syncIndexes(), AppState.syncIndexes(), LoginGuard.syncIndexes()]).catch((e) =>
    console.error("Index sync failed:", e.message)
  );
  await cached.indexes;
  return cached.conn;
}
