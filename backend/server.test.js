import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
const { app } = await import("./server.js");

test("GET /health returns ok", async () => {
  const response = await request(app).get("/health").expect(200);

  assert.equal(response.body.ok, true);
});

test("API routes require a Firebase bearer token", async () => {
  const response = await request(app).get("/api/dashboard").expect(401);

  assert.equal(response.body.error, "Token ausente.");
});

test("invalid JSON is rejected", async () => {
  const response = await request(app)
    .post("/api/commands")
    .set("Content-Type", "application/json")
    .send("{invalid")
    .expect(400);

  assert.equal(response.body.error, "JSON invalido.");
});
