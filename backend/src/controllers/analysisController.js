
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";

import { extractVideoFrames } from "../services/videoFrameService.js";
import {
  detectRoadDamage,
  detectRoadDamageInFrames,
} from "../services/detectionService.js";
import {
  extractImageLocation,
  parseManualLocation,
} from "../services/location.js";
import Report from "../models/Report.js";

const ALLOWED_STATUSES = [
  "Reported",
  "Assigned",
  "In Progress",
  "Repaired",
  "Verified",
];

const STATUS_TRANSITIONS = {
  Reported: ["Reported", "Assigned"],
  Assigned: ["Assigned", "In Progress", "Reported"],
  "In Progress": ["In Progress", "Assigned", "Repaired"],
  Repaired: ["Repaired", "In Progress", "Verified"],
  Verified: ["Verified", "In Progress"],
};

const SEVERITY_POINTS = {
  Critical: 90,
  High: 75,
  Medium: 55,
  Low: 30,
  None: 0,
};

function isValidCoordinates(location) {
  if (!location) return false;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function hasVerifiedLocation(location) {
  if (!isValidCoordinates(location)) return false;

  const source = String(location.source || "").toLowerCase();

  return !source.includes("simulat") && !source.includes("demo");
}

function calculateDistanceMeters(first, second) {
  const radians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;

  const lat1 = radians(Number(first.latitude));
  const lat2 = radians(Number(second.latitude));
  const deltaLat = radians(
    Number(second.latitude) - Number(first.latitude)
  );
  const deltaLon = radians(
    Number(second.longitude) - Number(first.longitude)
  );

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDetectionTypes(detections = []) {
  return [
    ...new Set(
      detections
        .map((detection) =>
          String(
            detection?.type ||
              detection?.class_name ||
              detection?.className ||
              detection?.label ||
              ""
          )
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ),
  ];
}

function getSeverity(detections = []) {
  const severities = ["Critical", "High", "Medium", "Low"];

  for (const severity of severities) {
    if (
      detections.some(
        (detection) =>
          String(detection?.severity || "").toLowerCase() ===
          severity.toLowerCase()
      )
    ) {
      return severity;
    }
  }

  return detections.length > 0 ? "Low" : "None";
}

function calculatePriority(detections, location, isSimulated) {
  const severity = getSeverity(detections);
  const reasons = [];

  let score = SEVERITY_POINTS[severity] ?? 0;

  reasons.push(
    severity === "None"
      ? "No road defects detected: base score 0."
      : `${severity} severity: base score ${score}.`
  );

  const confidences = detections
    .map((item) => Number(item?.confidence))
    .filter((value) => Number.isFinite(value));

  if (confidences.length > 0) {
    const averageConfidence =
      confidences.reduce((sum, value) => sum + value, 0) /
      confidences.length;

    const bonus = Math.round(
      Math.max(0, Math.min(1, averageConfidence)) * 10
    );

    score += bonus;
    reasons.push(`Detection confidence contributes ${bonus} points.`);
  }

  if (detections.length > 1) {
    const bonus = Math.min(5, detections.length - 1);
    score += bonus;
    reasons.push(
      `${detections.length} detections contribute ${bonus} additional points.`
    );
  }

  if (hasVerifiedLocation(location)) {
    score += 5;
    reasons.push("Verified coordinates contribute 5 points.");
  } else {
    reasons.push("No verified location bonus applied.");
  }

  if (isSimulated) {
    reasons.push(
      "Demo detections are simulated and must not be treated as verified AI findings."
    );
  }

  return {
    severity,
    priorityScore: Math.max(0, Math.min(100, score)),
    priorityReasons: reasons,
  };
}

async function findPossibleDuplicate(report) {
  // Never group simulated results or reports without verified coordinates.
  if (
    report.isSimulated ||
    !hasVerifiedLocation(report.location)
  ) {
    return null;
  }

  const newTypes = getDetectionTypes(report.detections);

  if (newTypes.length === 0) return null;

  const existingReports = await Report.find({
    id: { $ne: report.id },
    isSimulated: false,
    "location.latitude": { $ne: null },
    "location.longitude": { $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  const matches = [];

  for (const existing of existingReports) {
    if (!hasVerifiedLocation(existing.location)) continue;

    const oldTypes = getDetectionTypes(existing.detections);
    const sharedTypes = newTypes.filter((type) =>
      oldTypes.includes(type)
    );

    // A matching defect class AND a close GPS location are required.
    if (sharedTypes.length === 0) continue;

    const distance = calculateDistanceMeters(
      report.location,
      existing.location
    );

    if (distance <= 8) {
      matches.push({
        existing,
        distance,
        sharedTypes,
      });
    }
  }

  matches.sort((a, b) => a.distance - b.distance);

  return matches[0] || null;
}

async function saveReport(data) {
  const priority = calculatePriority(
    data.detections,
    data.location,
    data.isSimulated
  );

  const report = new Report({
    ...data,
    severity: priority.severity,
    priorityScore: priority.priorityScore,
    priorityReasons: priority.priorityReasons,
    detectionCount: data.detections.length,
    repairStatus: "Reported",
    statusHistory: [
      {
        status: "Reported",
        note: "Inspection report created.",
        changedBy: "System",
      },
    ],
  });

  const duplicate = await findPossibleDuplicate(report);

  if (duplicate) {
    report.duplicateFlag = true;
    report.possibleDuplicateOf = duplicate.existing.id;
    report.duplicateDistanceMeters =
      Math.round(duplicate.distance * 100) / 100;

    report.duplicateMatchReason =
      `Within ${report.duplicateDistanceMeters} metres; matching defects: ` +
      duplicate.sharedTypes.join(", ");

    report.incidentGroupId =
      duplicate.existing.incidentGroupId || duplicate.existing.id;
  } else {
    report.incidentGroupId = report.id;
  }

  // Always create a separate report; never delete or merge historical records.
  await report.save();

  return report;
}

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

    const location =
      manualLocation ||
      (await extractImageLocation(req.file.path));

    const analysis = await detectRoadDamage(req.file);
    const detections = Array.isArray(analysis.detections)
      ? analysis.detections
      : [];

    const report = await saveReport({
      id: randomUUID(),
      image: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`,
      localImageUrl: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mediaType: "image",
      createdAt: new Date(),
      location: location || null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      detections,
      mode: analysis.mode,
      isSimulated: Boolean(analysis.isSimulated),
    });

    return res.status(201).json({
      success: true,
      message: analysis.isSimulated
        ? "Image uploaded. Demo detections are simulated, not AI predictions."
        : "Image analyzed by the connected AI service.",
      report,
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    return next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

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
  try {
    const report = await Report.findOne({
      id: req.params.id,
    }).lean();

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

export async function analyzeVideo(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Upload a road video using the 'video' field.",
    });
  }

  let frameDirectory;

  try {
    const manualLocation = parseManualLocation(
      req.body.latitude,
      req.body.longitude
    );

    const extracted = await extractVideoFrames(req.file.path);
    frameDirectory = extracted.directory;

    const analysis = await detectRoadDamageInFrames(
      extracted.frames
    );

    const detections = Array.isArray(analysis.detections)
      ? analysis.detections
      : [];

    const report = await saveReport({
      id: randomUUID(),
      image: req.file.filename,
      imageUrl: `/uploads/${req.file.filename}`,
      mediaUrl: `/uploads/${req.file.filename}`,
      localImageUrl: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mediaType: "video",
      createdAt: new Date(),
      location: manualLocation || null,
      latitude: manualLocation?.latitude ?? null,
      longitude: manualLocation?.longitude ?? null,
      detections,
      detectionCount: detections.length,
      framesAnalyzed: analysis.framesAnalyzed || 0,
      mode: analysis.mode,
      isSimulated: Boolean(analysis.isSimulated),
    });

    return res.status(201).json({
      success: true,
      message: analysis.isSimulated
        ? "Video processed using demo detections."
        : "Video frames analyzed by the connected AI service.",
      report,
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    return next(error);
  } finally {
    if (frameDirectory) {
      await fs
        .rm(frameDirectory, {
          recursive: true,
          force: true,
        })
        .catch(() => {});
    }
  }
}

export async function updateReportStatus(req, res, next) {
  try {
    const {
      repairStatus,
      assignedTeam,
      repairNotes,
      changedBy,
    } = req.body;

    if (!ALLOWED_STATUSES.includes(repairStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid repair status.",
      });
    }

    const report = await Report.findOne({
      id: req.params.id,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found. Refresh the reports list and try again.",
      });
    }

    const current =
      report.repairStatus === "Open"
        ? "Reported"
        : report.repairStatus || "Reported";

    if (!STATUS_TRANSITIONS[current]?.includes(repairStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${current} to ${repairStatus}.`,
      });
    }

    const team = String(
      assignedTeam ?? report.assignedTeam ?? ""
    ).trim();

    if (repairStatus === "Assigned" && !team) {
      return res.status(400).json({
        success: false,
        message: "Enter the responsible team before assigning.",
      });
    }

    if (repairStatus === "Verified" && current !== "Repaired") {
      return res.status(400).json({
        success: false,
        message: "Repair must be completed before verification.",
      });
    }

    report.repairStatus = repairStatus;
    report.assignedTeam = team;
    report.repairNotes = String(
      repairNotes ?? report.repairNotes ?? ""
    ).trim();

    if (current !== repairStatus) {
      report.statusHistory.push({
        status: repairStatus,
        note: report.repairNotes,
        changedBy: String(changedBy || "Field Team"),
        changedAt: new Date(),
      });
    }

    if (repairStatus === "Repaired" && !report.repairedAt) {
      report.repairedAt = new Date();
    }

    if (repairStatus === "Verified" && !report.verifiedAt) {
      report.verifiedAt = new Date();
    }

    await report.save();

    return res.json({
      success: true,
      message: "Repair workflow saved to MongoDB.",
      report,
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadRepairPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a repair photo.",
      });
    }

    const type = String(req.body.type || "").toLowerCase();

    if (!["before", "after"].includes(type)) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(400).json({
        success: false,
        message: "Photo type must be before or after.",
      });
    }

    const report = await Report.findOne({
      id: req.params.id,
    });

    if (!report) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(404).json({
        success: false,
        message: "Report not found.",
      });
    }

    const field =
      type === "before"
        ? "beforeRepairPhotos"
        : "afterRepairPhotos";

    const photo = {
      url: `/uploads/repairs/${req.file.filename}`,
      note: String(req.body.note || "").trim(),
      uploadedAt: new Date(),
    };

    report[field].push(photo);
    await report.save();

    return res.status(201).json({
      success: true,
      message: `${
        type === "before" ? "Before" : "After"
      } repair photo saved.`,
      report,
      photo,
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    return next(error);
  }
}
