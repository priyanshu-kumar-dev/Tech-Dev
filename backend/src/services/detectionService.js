import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { normalizeDetection } from "./severity.js";

const demoDetections = [
  {
    type: "Pothole",
    confidence: 0.93,
    simulated: true,
  },
  {
    type: "Longitudinal Crack",
    confidence: 0.86,
    simulated: true,
  },
  {
    type: "Damaged Surface",
    confidence: 0.81,
    simulated: true,
  },
];

async function runDemoDetection() {
  // These are sample records, not predictions from the uploaded image.
  return demoDetections.map((item) =>
    normalizeDetection({
      ...item,
      id: randomUUID(),
    })
  );
}

async function runPythonDetection(file) {
  const serviceUrl =
    process.env.AI_SERVICE_URL || "http://localhost:8000/analyze";

  const imageBuffer = await fs.readFile(file.path);
  const formData = new FormData();

  formData.append(
    "image",
    new Blob([imageBuffer], { type: file.mimetype }),
    file.originalname
  );

  let response;

  try {
    response = await fetch(serviceUrl, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(55000),
    });
  } catch {
    const error = new Error(
      "Python AI service is unavailable. Start the AI service or use AI_MODE=demo."
    );
    error.status = 503;
    throw error;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      (typeof data?.message === "string" && data.message) ||
        (typeof data?.detail === "string" && data.detail) ||
        "Python AI service failed to analyze the image."
    );
    error.status = 502;
    throw error;
  }

  if (!Array.isArray(data?.detections)) {
    const error = new Error(
      "Invalid AI response: expected a detections array."
    );
    error.status = 502;
    throw error;
  }

  return {
    detections: data.detections.map((item) =>
    normalizeDetection({
      ...item,
      simulated: false,
    })
    ),
    inferenceTimeMs:
      typeof data.inferenceTimeMs === "number" &&
      Number.isFinite(data.inferenceTimeMs) &&
      data.inferenceTimeMs >= 0
        ? data.inferenceTimeMs
        : null,
  };
}

export async function detectRoadDamage(file) {
  if (process.env.AI_MODE !== "demo") {
    const result = await runPythonDetection(file);
    return {
      detections: result.detections,
      mode: "python",
      isSimulated: false,
      inferenceTimeMs: result.inferenceTimeMs,
    };
  }

  return {
    detections: await runDemoDetection(),
    mode: "demo",
    isSimulated: true,
    inferenceTimeMs: null,
  };
}