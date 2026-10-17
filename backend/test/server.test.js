import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import { app } from "../src/server.js";
import Report from "../src/models/report.model.js";
import {
  deleteReport,
  updateReportStatus,
} from "../src/controllers/analysisController.js";

let server;
let baseUrl;
const createdReports = [];

before(async () => {
  if (process.env.MONGO_URL) {
    await mongoose.connect(process.env.MONGO_URL);
  }
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (mongoose.connection.readyState === 1) {
    const reports = await Report.find({
      _id: { $in: createdReports },
    }).select("image repairImageUrl");
    await Report.deleteMany({ _id: { $in: createdReports } });
    await Promise.all(
      reports.flatMap((report) =>
        [report.image, report.repairImageUrl?.split("/").at(-1)]
          .filter(Boolean)
          .map((filename) =>
            fs.unlink(new URL(`../uploads/${filename}`, import.meta.url)).catch(
              (error) => {
                if (error.code !== "ENOENT") throw error;
              }
            )
          )
      )
    );
    await mongoose.disconnect();
  }
});

test("health endpoint reports the API as online", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.status, "online");
  assert.equal(data.database, mongoose.connection.readyState === 1
    ? "connected"
    : "disconnected");
  assert.ok(data.timestamp);
});

test("reports endpoint requires persistent database storage", async () => {
  const response = await fetch(`${baseUrl}/api/reports`);
  const data = await response.json();

  if (mongoose.connection.readyState === 1) {
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.reports));
  } else {
    assert.equal(response.status, 503);
    assert.match(data.message, /MongoDB/i);
  }
});

test("model performance only publishes actual inference timing and leaves unmeasured evaluation metrics empty", async () => {
  const response = await fetch(`${baseUrl}/api/analytics/model-performance`);
  const data = await response.json();

  if (mongoose.connection.readyState === 1) {
    assert.equal(response.status, 200);
    assert.equal(data.evaluationAvailable, false);
    assert.equal(data.precision, null);
    assert.equal(data.recall, null);
    assert.equal(data.mAP, null);
    assert.equal(data.falseDetections, null);
    assert.equal(typeof data.sampleCount, "number");
  } else {
    assert.equal(response.status, 503);
  }
});

test("unknown reports return a not-found response", async () => {
  const response = await fetch(`${baseUrl}/api/reports/not-a-real-report`);
  const data = await response.json();

  assert.equal(
    response.status,
    mongoose.connection.readyState === 1 ? 404 : 503
  );
  assert.match(data.message, mongoose.connection.readyState === 1 ? /not found/i : /MongoDB/i);
});

test("maintenance status updates require an authenticated administrator", async () => {
  const response = await fetch(
    `${baseUrl}/api/reports/not-a-real-report/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Resolved" }),
    }
  );
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.match(data.message, /sign in/i);
});

test("report deletion requires an authenticated administrator", async () => {
  const response = await fetch(`${baseUrl}/api/reports/not-a-real-report`, {
    method: "DELETE",
  });
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.match(data.message, /sign in/i);
});

test("analysis requires an uploaded road image", async () => {
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /road image/i);
});

test("analysis persists reports and flags same-image reports within 100 metres", async (context) => {
  if (mongoose.connection.readyState !== 1) {
    context.skip("MongoDB is not configured for persistence integration tests.");
    return;
  }

  async function submitReport() {
    const form = new FormData();
    form.append("image", new Blob(["test road image"], { type: "image/png" }), "road.png");
    form.append("latitude", "26.9124");
    form.append("longitude", "75.7873");
    form.append("city", "Jaipur");
    form.append("ward", "Ward 12");
    const previousAiMode = process.env.AI_MODE;
    process.env.AI_MODE = "demo";
    let response;
    try {
      response = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        body: form,
      });
    } finally {
      if (previousAiMode === undefined) {
        delete process.env.AI_MODE;
      } else {
        process.env.AI_MODE = previousAiMode;
      }
    }
    return { response, data: await response.json() };
  }

  const first = await submitReport();
  assert.equal(first.response.status, 201);
  createdReports.push(first.data.report.id);
  assert.equal(first.data.report.maintenanceStatus, "Reported");
  assert.equal(first.data.report.city, "Jaipur");
  assert.equal(first.data.report.statusHistory[0].status, "Reported");

  const fetched = await fetch(`${baseUrl}/api/reports/${first.data.report.id}`);
  assert.equal(fetched.status, 200);
  assert.equal((await fetched.json()).report.id, first.data.report.id);

  const statusResponse = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await updateReportStatus(
    {
      params: { id: first.data.report.id },
      body: { status: "Assigned", assignedTo: "Road crew 4" },
      user: { email: "operator@example.com" },
    },
    statusResponse
  );
  assert.equal(statusResponse.statusCode, 200);
  assert.equal(statusResponse.body.report.maintenanceStatus, "Assigned");
  assert.equal(statusResponse.body.report.assignedTo, "Road crew 4");
  assert.equal(statusResponse.body.report.statusHistory.length, 2);

  const second = await submitReport();
  assert.equal(second.response.status, 201);
  createdReports.push(second.data.report.id);
  assert.equal(second.data.report.possibleDuplicateOf, first.data.report.id);

  const deleteResponse = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await deleteReport(
    { params: { id: second.data.report.id } },
    deleteResponse
  );
  assert.equal(deleteResponse.statusCode, 200);
  assert.equal(await Report.findById(second.data.report.id), null);
});
