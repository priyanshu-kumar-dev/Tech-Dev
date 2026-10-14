
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import analysisRoutes from "./routes/analysis.js";
import reportsRoutes from "./routes/reports.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

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

// Root route
app.get("/", (req, res) => {
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
    mode: process.env.AI_MODE || "demo",
    timestamp: new Date().toISOString(),
  });
});

// Analysis and reports routes
app.use("/api", analysisRoutes);
app.use("/api", reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log("======================================");
  console.log("       ROADSHIELD AI BACKEND");
  console.log("======================================");
  console.log(`API:    http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Mode:   ${process.env.AI_MODE || "demo"}`);
  console.log("======================================");
});
