
import { randomUUID } from "node:crypto";

const severityRules = {
  Pothole: {
    severity: "Critical",
    baseScore: 95,
    action: "Urgent inspection and immediate safety assessment.",
  },

  "Alligator Crack": {
    severity: "High",
    baseScore: 82,
    action: "Inspect pavement failure and prioritize road repair.",
  },

  "Longitudinal Crack": {
    severity: "Medium",
    baseScore: 55,
    action: "Seal the crack and monitor deterioration.",
  },

  "Transverse Crack": {
    severity: "Medium",
    baseScore: 50,
    action: "Inspect and seal the transverse crack.",
  },

  "Damaged Surface": {
    severity: "High",
    baseScore: 76,
    action: "Inspect damaged pavement and schedule repair.",
  },

  "Uneven Road": {
    severity: "High",
    baseScore: 78,
    action: "Inspect road level differences and assess vehicle safety.",
  },

  "Road Crack": {
    severity: "Medium",
    baseScore: 55,
    action: "Inspect the crack and assess whether sealing is required.",
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getSeverity(type, confidence = 0.8) {
  const rule = severityRules[type] || {
    severity: "Medium",
    baseScore: 50,
    action: "Manual road inspection required.",
  };

  const normalizedConfidence = clamp(
    Number(confidence) || 0,
    0,
    1
  );

  return {
    severity: rule.severity,
    priorityScore: Math.round(
      rule.baseScore * (0.7 + 0.3 * normalizedConfidence)
    ),
    confidence: normalizedConfidence,
    repairAction: rule.action,
  };
}

export function normalizeDetection(detection) {
  const type = String(
    detection.type || detection.class_name || "Road Defect"
  );

  const confidenceValue = Number(
    detection.confidence ?? detection.score ?? 0.5
  );

  const confidence = clamp(
    confidenceValue > 1
      ? confidenceValue / 100
      : confidenceValue,
    0,
    1
  );

  const result = getSeverity(type, confidence);

  return {
    id: detection.id || randomUUID(),
    type,
    ...result,
    boundingBox:
      detection.boundingBox || detection.bbox || null,
    simulated: Boolean(detection.simulated),
  };
}

export function getRepairAction(severity) {
  const actions = {
    Critical:
      "Urgent inspection and immediate safety assessment.",
    High:
      "Prioritize repair and inspect the affected road.",
    Medium:
      "Schedule maintenance and monitor deterioration.",
    Low:
      "Record defect and monitor during routine inspection.",
  };

  return (
    actions[severity] ||
    "Manual road inspection required."
  );
}
