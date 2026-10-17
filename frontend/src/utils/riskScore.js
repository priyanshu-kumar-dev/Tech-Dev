const severityBaseScores = {
  Critical: 95,
  High: 82,
  Medium: 55,
  Low: 30,
};

const severityRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function hasValidLocation(location) {
  const hasCoordinate = (value) =>
    value !== null && value !== undefined && value !== "";
  if (!hasCoordinate(location?.latitude) || !hasCoordinate(location?.longitude)) {
    return false;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeConfidence(value, fallback = 0.5) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const numericValue = Number(value);
  const confidence = Number.isFinite(numericValue)
    ? numericValue > 1
      ? numericValue / 100
      : numericValue
    : fallback;
  return clamp(confidence, 0, 1);
}

function getDetectionScore(detection) {
  const suppliedScore = Number(detection.priorityScore);
  if (
    detection.priorityScore !== null &&
    detection.priorityScore !== undefined &&
    Number.isFinite(suppliedScore)
  ) {
    return clamp(suppliedScore, 0, 100);
  }

  const baseScore = severityBaseScores[detection.severity] || 50;
  const confidence = normalizeConfidence(detection.confidence);
  return Math.round(baseScore * (0.7 + 0.3 * confidence));
}

export function calculateRiskScore(report) {
  const detections = Array.isArray(report.detections) ? report.detections : [];
  const scoredDetections = detections.map((detection) => ({
    detection,
    score: getDetectionScore(detection),
  }));
  const topDetection = scoredDetections.reduce(
    (top, candidate) => (!top || candidate.score > top.score ? candidate : top),
    null
  );
  const unresolved = report.maintenanceStatus !== "Resolved";
  const multipleDefectBonus = Math.min(Math.max(detections.length - 1, 0) * 5, 15);
  const score = clamp(
    Math.round((topDetection?.score || 0) + multipleDefectBonus + (unresolved ? 10 : 0)),
    0,
    100
  );

  const reasons = [];
  if (topDetection) {
    const severity = topDetection.detection.severity;
    reasons.push(
      severity === "Critical"
        ? "Critical defect"
        : `${severityBaseScores[severity] ? severity : "Unclassified"} severity`
    );
  } else {
    reasons.push("No detections; manual review needed");
  }

  const highConfidenceDetections = detections.filter((detection) => {
    return normalizeConfidence(detection.confidence, 0) >= 0.8;
  });
  const hasRealHighConfidence = highConfidenceDetections.some(
    (detection) => !(detection.simulated ?? report.isSimulated ?? false)
  );
  const hasSimulatedHighConfidence = highConfidenceDetections.some(
    (detection) => detection.simulated ?? report.isSimulated ?? false
  );
  if (hasRealHighConfidence) reasons.push("High model confidence");
  else if (hasSimulatedHighConfidence) reasons.push("High confidence (demo)");
  if (detections.length > 1) reasons.push(`${detections.length} detected defects`);
  if (unresolved) reasons.push("Unresolved");

  const hasLocation = hasValidLocation(report.location);
  if (!hasLocation) reasons.push("Location verification needed");

  return {
    score,
    reasons,
    topDetection: topDetection?.detection || null,
    defectCount: detections.length,
    hasLocation,
  };
}

export function getReportSeverity(report) {
  return (Array.isArray(report.detections) ? report.detections : []).reduce(
    (highest, detection) =>
      (severityRank[detection.severity] || 0) >
      (severityRank[highest] || 0)
        ? detection.severity
        : highest,
    "Unknown"
  );
}

export function getPriorityQueueReports(reports = []) {
  if (!Array.isArray(reports)) return [];
  return reports
    .filter((report) => report && report.maintenanceStatus !== "Resolved")
    .map((report) => {
      const createdAt = new Date(report.createdAt || 0).getTime();
      return {
        report,
        score: calculateRiskScore(report).score,
        timestamp: Number.isFinite(createdAt) ? createdAt : 0,
      };
    })
    .sort((a, b) => {
      const scoreDifference = b.score - a.score;
      if (scoreDifference !== 0) return scoreDifference;
      return b.timestamp - a.timestamp;
    })
    .map(({ report }) => report);
}
