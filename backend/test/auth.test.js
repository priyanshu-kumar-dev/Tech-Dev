import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { app } from "../src/server.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("signup requires the account fields", async () => {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "test@example.com" }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /password/i);
});

test("signup rejects mismatched passwords", async () => {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "correct horse battery",
      passwordConfirm: "different password",
    }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /do not match/i);
});

test("login requires email and password", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com" }),
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.message, /email and password/i);
});
