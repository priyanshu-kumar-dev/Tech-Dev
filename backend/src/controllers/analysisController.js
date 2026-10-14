import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { detectRoadDamage } from "../services/detectionService.js";
import {
  extractImageLocation,
  parseManualLocation,
} from "../services/location.js";

const reports = [];

export async function analyzeImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Upload a road image using the 'image' field.",
    });
  }

  try {
    const manualLocation = parseManualLocation(
      req.body.latitude,
      req.body.longitude
    );

    // Prefer coordinates explicitly supplied by the user/browser.
    const location =
      manualLocation || (await extractImageLocation(req.file.path));

    const analysis = await detectRoadDamage(req.file);

    const report = {
      id: randomUUID(),
      image: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      createdAt: new Date().toISOString(),
      location,
      detections: analysis.detections,
      mode: analysis.mode,
      isSimulated: analysis.isSimulated,
    };

    reports.unshift(report);

    return res.status(201).json({
      success: true,
      message: analysis.isSimulated
        ? "Image uploaded. Demo detections are simulated, not AI predictions."
        : "Image analyzed by the connected AI service.",
      report,
    });
  } catch (error) {
    // Invalid coordinates or detection failure should not leave
    // an untracked uploaded file behind.
    await fs.unlink(req.file.path).catch(() => {});
    next(error);
  }
}

export function listReports(req, res) {
  return res.json({
    success: true,
    count: reports.length,
    reports,
  });
}

export function getReportById(req, res) {
  const report = reports.find((item) => item.id === req.params.id);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Report not found.",
    });
  }

  return res.json({
    success: true,
    report,
  });
}