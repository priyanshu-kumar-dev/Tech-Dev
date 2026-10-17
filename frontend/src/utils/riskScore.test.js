import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateRiskScore,
  getPriorityQueueReports,
  getReportSeverity,
  hasValidLocation,
} from "./riskScore.js";

test("risk score combines strongest detection, multiple defects, and unresolved status", () => {
  const result = calculateRiskScore({
    maintenanceStatus: "Reported",
    location: { latitude: 12.9, longitude: 77.6 },
    detections: [
      { severity: "Critical", priorityScore: 90, confidence: 0.92 },
      { severity: "Medium", priorityScore: 55, confidence: 0.6 },
    ],
  });

  assert.equal(result.score, 100);
  assert.deepEqual(result.reasons, [
    "Critical defect",
    "High model confidence",
    "2 detected defects",
    "Unresolved",
  ]);
});

test("resolved report has no unresolved bonus and missing coordinates need verification", () => {
  const result = calculateRiskScore({
    maintenanceStatus: "Resolved",
    detections: [{ severity: "High", priorityScore: 80, confidence: 0.7 }],
  });

  assert.equal(result.score, 80);
  assert.ok(result.reasons.includes("Location verification needed"));
  assert.ok(!result.reasons.includes("Unresolved"));
});

test("report severity reflects its most severe detection", () => {
  assert.equal(
    getReportSeverity({
      detections: [
        { severity: "Medium" },
        { severity: "High" },
        { severity: "Low" },
      ],
    }),
    "High"
  );
});

test("missing and empty coordinates are not treated as zero coordinates", () => {
  assert.equal(hasValidLocation({ latitude: null, longitude: null }), false);
  assert.equal(hasValidLocation({ latitude: "", longitude: "" }), false);
  assert.equal(hasValidLocation({ latitude: 0, longitude: 0 }), true);
});

test("simulated confidence is not presented as a model prediction", () => {
  const result = calculateRiskScore({
    isSimulated: true,
    maintenanceStatus: "Reported",
    location: { latitude: 12.9, longitude: 77.6 },
    detections: [
      { severity: "Critical", priorityScore: 90, confidence: 0.92 },
    ],
  });

  assert.ok(result.reasons.includes("High confidence (demo)"));
  assert.ok(!result.reasons.includes("High model confidence"));
});

test("invalid confidence values do not produce a non-numeric risk score", () => {
  const result = calculateRiskScore({
    maintenanceStatus: "Reported",
    detections: [{ severity: "High", confidence: "not-a-number" }],
  });

  assert.equal(Number.isFinite(result.score), true);
  assert.ok(result.score >= 0 && result.score <= 100);
});

test("priority queue excludes resolved reports and sorts open reports by risk score", () => {
  const lowRisk = {
    id: "low",
    maintenanceStatus: "Reported",
    detections: [{ severity: "Low", priorityScore: 30 }],
  };
  const highRisk = {
    id: "high",
    maintenanceStatus: "In Progress",
    detections: [{ severity: "Critical", priorityScore: 90 }],
  };
  const resolved = {
    id: "resolved",
    maintenanceStatus: "Resolved",
    detections: [{ severity: "Critical", priorityScore: 100 }],
  };
  const reports = [lowRisk, resolved, highRisk];
  const queue = getPriorityQueueReports(reports);

  assert.deepEqual(queue.map((report) => report.id), ["high", "low"]);
  assert.deepEqual(reports, [lowRisk, resolved, highRisk]);
});
