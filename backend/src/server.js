
import "./config/env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "node:fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import analysisRoutes from "./routes/analysis.js";
import authRoutes from "./routes/auth.route.js";
import reportsRoutes from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";
import connectDB from "./db/db.js";

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
app.use(cookieParser());

app.use("/uploads", express.static(uploadsDirectory));

// Root route
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

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    project: "RoadShield AI",
    status: "online",
    mode: process.env.AI_MODE || "python",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

export { app };

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log("======================================");
      console.log("       ROADSHIELD AI BACKEND");
      console.log("======================================");
      console.log(`API:    http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(`Mode:   ${process.env.AI_MODE || "python"}`);
      console.log("======================================");
    });
  });
}
