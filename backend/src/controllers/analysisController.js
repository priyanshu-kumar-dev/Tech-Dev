import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectRoadDamage } from "../services/detectionService.js";
import {
  extractImageLocation,
  parseManualLocation,
} from "../services/location.js";
import Report from "../models/report.model.js";

export const maintenanceStatuses = [
  "Reported",
  "Verified",
  "Assigned",
  "In Progress",
  "Resolved",
];

const duplicateDistanceMeters = 100;
const uploadsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../uploads"
);

function databaseUnavailable(res) {
  return res.status(503).json({
    success: false,
    message: "Report storage is unavailable because MongoDB is not connected.",
  });
}

function normalizeArea(value, label) {
  if (value == null || value === "") return "";
  if (typeof value !== "string" || value.trim().length > 100) {
    const error = new Error(`${label} must be a string of at most 100 characters.`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function distanceBetweenMeters(left, right) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(left.latitude)) *
      Math.cos(radians(right.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export async function analyzeImage(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Upload a road image using the 'image' field.",
    });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      const error = new Error(
        "Report storage is unavailable because MongoDB is not connected."
      );
      error.status = 503;
      throw error;
    }

    const manualLocation = parseManualLocation(
      req.body.latitude,
      req.body.longitude
    );
    const city = normalizeArea(req.body.city, "City");
    const ward = normalizeArea(req.body.ward, "Ward");

    // Prefer coordinates explicitly supplied by the user/browser.
    const location =
      manualLocation || (await extractImageLocation(req.file.path));

    const analysis = await detectRoadDamage(req.file);
    const id = randomUUID();
    const imageHash = createHash("sha256")
      .update(await fs.readFile(req.file.path))
      .digest("hex");
    let possibleDuplicateOf = null;

    if (
      location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude)
    ) {
      const candidates = await Report.find({
        imageHash,
        _id: { $ne: id },
      })
        .sort({ createdAt: -1 })
        .limit(20);
      const duplicate = candidates.find(
        (candidate) =>
          candidate.location &&
          distanceBetweenMeters(location, candidate.location) <=
            duplicateDistanceMeters
      );
      possibleDuplicateOf = duplicate?.id || null;
    }

    const report = await Report.create({
      _id: id,
      image: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      location,
      city,
      ward,
      detections: analysis.detections,
      mode: analysis.mode,
      isSimulated: analysis.isSimulated,
      maintenanceStatus: "Reported",
      statusHistory: [{
        status: "Reported",
        changedAt: new Date(),
        changedBy: "system",
      }],
      inferenceTimeMs: analysis.inferenceTimeMs,
      imageHash,
      possibleDuplicateOf,
    });

    return res.status(201).json({
      success: true,
      message: analysis.isSimulated
        ? "Report saved for review. Demo detections are simulated, not AI predictions."
        : "AI analysis complete and report saved. The responsible team can verify and assign the repair.",
      report,
    });
  } catch (error) {
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("[Upload cleanup error]", cleanupError.message);
      }
    }
    next(error);
  }
}

export async function listReports(req, res, next) {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getReportById(req, res, next) {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const report = await Report.findById(req.params.id);

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
  } catch (error) {
    return next(error);
  }
}

export async function updateReportStatus(req, res, next) {
  const { status } = req.body || {};

  if (!maintenanceStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${maintenanceStatuses.join(", ")}.`,
    });
  }

  const assignedTo = req.body.assignedTo;
  if (
    assignedTo !== undefined &&
    (typeof assignedTo !== "string" || assignedTo.trim().length > 120)
  ) {
    return res.status(400).json({
      success: false,
      message: "Assignee must be a string of at most 120 characters.",
    });
  }

  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    const nextAssignee = assignedTo?.trim() || report.assignedTo;
    if (status === "Assigned" && !nextAssignee) {
      return res.status(400).json({
        success: false,
        message: "Provide an assignee before moving a report to Assigned.",
      });
    }

    const changedAt = new Date();
    report.maintenanceStatus = status;
    report.assignedTo = nextAssignee;
    report.statusUpdatedAt = changedAt;
    report.statusUpdatedBy = req.user.email;
    report.statusHistory.push({
      status,
      changedAt,
      changedBy: req.user.email,
    });
    await report.save();

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function addRepairPhoto(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Upload the repair photo using the 'image' field.",
    });
  }

  if (mongoose.connection.readyState !== 1) {
    try {
      await fs.unlink(req.file.path);
    } catch (error) {
      if (error.code !== "ENOENT") return next(error);
    }
    return databaseUnavailable(res);
  }

  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    report.repairImageUrl = `/uploads/${req.file.filename}`;
    await report.save();
    return res.json({ success: true, report });
  } catch (error) {
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("[Repair photo cleanup error]", cleanupError.message);
      }
    }
    return next(error);
  }
}

export async function deleteReport(req, res, next) {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    await Report.updateMany(
      { possibleDuplicateOf: report.id },
      { $set: { possibleDuplicateOf: null } }
    );

    const filenames = [report.image, report.repairImageUrl?.split("/").at(-1)]
      .filter(Boolean)
      .map((filename) => path.basename(filename));
    const cleanupResults = await Promise.allSettled(
      filenames.map((filename) =>
        fs.unlink(path.join(uploadsDirectory, filename))
      )
    );
    const cleanupFailure = cleanupResults.find(
      (result) =>
        result.status === "rejected" && result.reason.code !== "ENOENT"
    );
    if (cleanupFailure) return next(cleanupFailure.reason);

    return res.json({
      success: true,
      message: "Report and associated images were deleted.",
      id: report.id,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getModelPerformance(req, res, next) {
  if (mongoose.connection.readyState !== 1) return databaseUnavailable(res);

  try {
    const [stats] = await Report.aggregate([
      {
        $match: {
          isSimulated: false,
          inferenceTimeMs: { $type: "number" },
        },
      },
      {
        $group: {
          _id: null,
          sampleCount: { $sum: 1 },
          averageInferenceTimeMs: { $avg: "$inferenceTimeMs" },
        },
      },
    ]);
    const averageInferenceTimeMs =
      stats?.averageInferenceTimeMs == null
        ? null
        : Math.round(stats.averageInferenceTimeMs * 100) / 100;

    return res.json({
      success: true,
      sampleCount: stats?.sampleCount || 0,
      averageInferenceTimeMs,
      precision: null,
      recall: null,
      mAP: null,
      falseDetections: null,
      evaluationAvailable: false,
      evaluationMessage:
        "Precision, recall, mAP, and false detections require labeled evaluation data; no evaluation results are configured.",
    });
  } catch (error) {
    return next(error);
  }
}