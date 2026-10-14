const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health reports API and current storage mode", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.status, "OK");
  assert.equal(data.database, "in-memory demo mode");
});

test("issues can be searched and filtered by severity", async () => {
  const response = await fetch(`${baseUrl}/api/issues?severity=Critical&search=pothole`);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.count, 1);
  assert.equal(data.issues[0].type, "Pothole");
  assert.equal(data.issues[0].severity, "Critical");
});

test("issue status updates validate values and persist in demo mode", async () => {
  const invalidResponse = await fetch(`${baseUrl}/api/issues/sample-1/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Closed" }),
  });
  assert.equal(invalidResponse.status, 400);

  const response = await fetch(`${baseUrl}/api/issues/sample-1/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "In progress" }),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.issue.status, "In progress");
});

test("unknown issues return a not-found response", async () => {
  const response = await fetch(`${baseUrl}/api/issues/not-a-real-issue/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Resolved" }),
  });

  assert.equal(response.status, 404);
});

test("uploads require a valid road image", async () => {
  const form = new FormData();
  form.append("lat", "37.7749");
  form.append("lng", "-122.4194");

  const response = await fetch(`${baseUrl}/api/issues`, { method: "POST", body: form });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /road image/i);
});
