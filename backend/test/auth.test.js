import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { app } from "../src/server.js";
import User from "../src/models/user.model.js";

let server;
let baseUrl;
let persistedTestEmail;

before(async () => {
  process.env.JWT_SECRET ||= "test-only-jwt-secret";
  if (process.env.MONGO_URL) {
    await mongoose.connect(process.env.MONGO_URL);
  }
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (persistedTestEmail && mongoose.connection.readyState === 1) {
    await User.deleteOne({ email: persistedTestEmail });
  }
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});

test("signup persists the new user in MongoDB", async (context) => {
  if (mongoose.connection.readyState !== 1) {
    context.skip("MongoDB is not configured for signup persistence tests.");
    return;
  }

  persistedTestEmail = `signup-${randomUUID()}@example.invalid`;
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Signup Persistence Test",
      email: persistedTestEmail,
      password: "test-password-123",
      passwordConfirm: "test-password-123",
    }),
  });
  const data = await response.json();
  const storedUser = await User.findOne({ email: persistedTestEmail }).select(
    "+password"
  );

  assert.equal(response.status, 201);
  assert.equal(data.status, "success");
  assert.ok(storedUser);
  assert.notEqual(storedUser.password, "test-password-123");
  assert.equal(data.user.email, persistedTestEmail);
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

test("current-user endpoint rejects requests without a session cookie", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const data = await response.json();

  assert.equal(response.status, 401);
  assert.match(data.message, /not signed in/i);
});

test("logout clears the authentication cookie", async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /token=;/i);
  assert.match(data.message, /signed out/i);
});
