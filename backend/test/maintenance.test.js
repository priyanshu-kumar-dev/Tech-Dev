import assert from "node:assert/strict";
import { test } from "node:test";
import { updateReportStatus } from "../src/controllers/analysisController.js";
import { requireAdmin } from "../src/middleware/auth.js";

function createResponse() {
  return {
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
}

test("maintenance status updates reject unsupported statuses", async () => {
  const response = createResponse();

  await updateReportStatus({ body: { status: "Cancelled" } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /Reported.*Resolved/);
});

test("only administrators pass the maintenance status authorization check", () => {
  const response = createResponse();
  let nextCalled = false;

  requireAdmin({ user: { role: "user" } }, response, () => {
    nextCalled = true;
  });

  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);

  requireAdmin({ user: { role: "admin" } }, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
