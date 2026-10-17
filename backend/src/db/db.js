import mongoose from "mongoose";
import "../config/env.js";

const connectDB = async () => {
  try {
    const mongoUrl =
      process.env.MONGO_URL || "mongodb://127.0.0.1:27017/roadshield-debug";
    await mongoose.connect(mongoUrl);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;