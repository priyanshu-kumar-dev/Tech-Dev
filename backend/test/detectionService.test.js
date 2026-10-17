import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { detectRoadDamage } from "../src/services/detectionService.js";

const originalAiMode = process.env.AI_MODE;
const originalAiServiceUrl = process.env.AI_SERVICE_URL;
const originalFetch = globalThis.fetch;
let temporaryDirectory;

afterEach(async () => {
  if (originalAiMode === undefined) {
    delete process.env.AI_MODE;
  } else {
    process.env.AI_MODE = originalAiMode;
  }

  if (originalAiServiceUrl === undefined) {
    delete process.env.AI_SERVICE_URL;
  } else {
    process.env.AI_SERVICE_URL = originalAiServiceUrl;
  }

  globalThis.fetch = originalFetch;

  if (temporaryDirectory) {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

test("Python AI failures preserve FastAPI detail messages", async () => {
  temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "roadshield-ai-test-")
  );
  const imagePath = path.join(temporaryDirectory, "road.png");
  await fs.writeFile(imagePath, "test image");

  process.env.AI_MODE = "python";
  process.env.AI_SERVICE_URL = "http://ai-service.test/analyze";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "Configured model could not load." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });

  await assert.rejects(
    detectRoadDamage({
      path: imagePath,
      mimetype: "image/png",
      originalname: "road.png",
    }),
    (error) => {
      assert.equal(error.status, 502);
      assert.equal(error.message, "Configured model could not load.");
      return true;
    }
  );
});

test("Python AI is the default and returns detections for each uploaded image", async () => {
  temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "roadshield-ai-test-")
  );

  const firstImagePath = path.join(temporaryDirectory, "pothole.png");
  const secondImagePath = path.join(temporaryDirectory, "crack.png");
  await fs.writeFile(firstImagePath, "pothole image");
  await fs.writeFile(secondImagePath, "crack image");

  delete process.env.AI_MODE;
  process.env.AI_SERVICE_URL = "http://ai-service.test/analyze";
  globalThis.fetch = async (_url, options) => {
    const image = options.body.get("image");
    const type = image.name === "pothole.png" ? "Pothole" : "Longitudinal Crack";

    return new Response(
      JSON.stringify({
        detections: [{ type, confidence: 0.9, simulated: false }],
        inferenceTimeMs: 12,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  };

  const potholeResult = await detectRoadDamage({
    path: firstImagePath,
    mimetype: "image/png",
    originalname: "pothole.png",
  });
  const crackResult = await detectRoadDamage({
    path: secondImagePath,
    mimetype: "image/png",
    originalname: "crack.png",
  });

  assert.equal(potholeResult.mode, "python");
  assert.equal(potholeResult.isSimulated, false);
  assert.equal(potholeResult.detections[0].type, "Pothole");
  assert.equal(crackResult.detections[0].type, "Longitudinal Crack");
});
