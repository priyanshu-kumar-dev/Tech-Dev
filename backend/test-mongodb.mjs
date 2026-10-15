import "dotenv/config";
import mongoose from "mongoose";

try {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("SUCCESS: MongoDB connected!");
  console.log("Database:", mongoose.connection.name);

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}
