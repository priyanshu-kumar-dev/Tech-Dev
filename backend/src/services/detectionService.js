
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { normalizeDetection } from "./severity.js";

const MAX_VIDEO_FRAMES = 30;

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
  return demoDetections.map((item) =>
    normalizeDetection({
      ...item,
      id: randomUUID(),
    })
  );
}

async function runPythonDetection(file, frameIndex = null) {
  const serviceUrl =
    process.env.AI_SERVICE_URL ||
    "http://127.0.0.1:8000/analyze";

  const imageBuffer = await fs.readFile(file.path);
  const formData = new FormData();

  formData.append(
    "image",
    new Blob([imageBuffer], {
      type: file.mimetype || "image/jpeg",
    }),
    file.originalname || `road-frame-${frameIndex ?? 0}.jpg`
  );

  let response;

  try {
    response = await fetch(serviceUrl, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(55000),
    });
  } catch (cause) {
    const error = new Error(
      "Python AI service is unavailable. Check that it is running on port 8000."
    );
    error.status = 503;
    error.cause = cause;
    throw error;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
<<<<<<< HEAD
      (typeof data?.message === "string" && data.message) ||
        (typeof data?.detail === "string" && data.detail) ||
        "Python AI service failed to analyze the image."
=======
      data?.detail ||
        data?.message ||
        `Python AI service returned HTTP ${response.status}.`
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
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

<<<<<<< HEAD
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
=======
  return data.detections.map((item) => {
    const detection = normalizeDetection({
      ...item,
      simulated: false,
    });

    return {
      ...detection,
      ...(frameIndex !== null ? { frameIndex } : {}),
    };
  });
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
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

/**
 * Analyze already-extracted video frames.
 * Each frame must be an image file with a readable `path`.
 */
export async function detectRoadDamageInFrames(frames) {
  if (!Array.isArray(frames) || frames.length === 0) {
    const error = new Error(
      "No video frames were provided for analysis."
    );
    error.status = 400;
    throw error;
  }

  if (frames.length > MAX_VIDEO_FRAMES) {
    const error = new Error(
      `Maximum ${MAX_VIDEO_FRAMES} extracted frames can be analyzed per video.`
    );
    error.status = 413;
    throw error;
  }

  if (process.env.AI_MODE !== "python") {
    return {
      detections: await runDemoDetection(),
      mode: "demo",
      isSimulated: true,
      framesAnalyzed: 0,
    };
  }

  const detections = [];

  // Process sequentially to avoid loading many model inferences at once.
  for (let index = 0; index < frames.length; index += 1) {
    const frameDetections = await runPythonDetection(
      frames[index],
      index + 1
    );

    detections.push(...frameDetections);
  }

  return {
    detections,
    mode: "python",
    isSimulated: false,
    framesAnalyzed: frames.length,
  };
}
