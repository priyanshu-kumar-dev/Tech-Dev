
import "dotenv/config";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import analysisRoutes from "./routes/analysis.js";
import reportsRoutes from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, "../uploads");

app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDirectory));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    project: "RoadShield AI",
    status: "online",
    message: "Backend is running successfully",
    health: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    project: "RoadShield AI",
    status: "online",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    mode: process.env.AI_MODE || "demo",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", analysisRoutes);
app.use("/api", reportsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected:", mongoose.connection.name);

    app.listen(PORT, () => {
      console.log("======================================");
      console.log("       ROADSHIELD AI BACKEND");
      console.log("======================================");
      console.log(`API:    http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(`Mode:   ${process.env.AI_MODE || "demo"}`);
      console.log("Cloudinary configured:", {
        cloudName: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
        apiKey: Boolean(process.env.CLOUDINARY_API_KEY),
        apiSecret: Boolean(process.env.CLOUDINARY_API_SECRET),
      });
      console.log("======================================");
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
