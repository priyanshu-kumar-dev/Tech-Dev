
<<<<<<< HEAD
import "./config/env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
=======
import "dotenv/config";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
import path from "path";
import fs from "node:fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import analysisRoutes from "./routes/analysis.js";
import authRoutes from "./routes/auth.route.js";
import reportsRoutes from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";
<<<<<<< HEAD
import connectDB from "./db/db.js";
=======
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, "../uploads");
const frontendBuildCandidates = [
  path.resolve(__dirname, "../../frontend/dist"),
  path.resolve(__dirname, "../frontend-dist"),
  path.resolve(__dirname, "../../frontend-dist"),
];
const frontendBuildDirectory =
  frontendBuildCandidates.find((candidate) => fs.existsSync(candidate)) ||
  frontendBuildCandidates[0];

app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
<<<<<<< HEAD
app.use(cookieParser());

=======
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
app.use("/uploads", express.static(uploadsDirectory));

app.get("/", (req, res) => {
  if (fs.existsSync(path.join(frontendBuildDirectory, "index.html"))) {
    return res.sendFile(path.join(frontendBuildDirectory, "index.html"));
  }
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
<<<<<<< HEAD
    mode: process.env.AI_MODE || "python",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
=======
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
    mode: process.env.AI_MODE || "demo",
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
    timestamp: new Date().toISOString(),
  });
});

<<<<<<< HEAD
app.get("/api/ready", (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      status: "not-ready",
      database: "disconnected",
    });
  }
  return res.status(200).json({
    success: true,
    status: "ready",
    database: "connected",
  });
});

// Analysis and reports routes
=======
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
app.use("/api", analysisRoutes);
app.use("/api", reportsRoutes);
app.use("/api/auth", authRoutes);

if (fs.existsSync(frontendBuildDirectory)) {
  app.use(express.static(frontendBuildDirectory));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      req.path === "/uploads" ||
      req.path.startsWith("/uploads/")
    ) {
      return next();
    }
    return res.sendFile(path.join(frontendBuildDirectory, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

<<<<<<< HEAD
export { app };

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  connectDB().then(() => {
=======
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected:", mongoose.connection.name);

>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
    app.listen(PORT, () => {
      console.log("======================================");
      console.log("       ROADSHIELD AI BACKEND");
      console.log("======================================");
      console.log(`API:    http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
<<<<<<< HEAD
      console.log(`Mode:   ${process.env.AI_MODE || "python"}`);
      console.log("======================================");
    });
  });
}
=======
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
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
