import assert from "node:assert/strict";
import { pool } from "../../lib/db/src/index.ts";
import { logger } from "../../artifacts/api-server/src/lib/logger.ts";
import app from "../../artifacts/api-server/src/app.ts";

// Exercise the real middleware in an isolated process, without consuming the
// running app's quotas, creating accounts, or submitting saved credentials.
logger.level = "silent";
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;

function request(path, options = {}) {
  return fetch(`${base}${path}`, {
    ...options,
    headers: {
      "X-Forwarded-For": "192.0.2.99",
      Origin: "https://somiren.com",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

try {
  for (let i = 0; i < 180; i++) {
    assert.equal((await request("/workspace/me")).status, 401);
  }
  const limited = await request("/workspace/me");
  assert.equal(limited.status, 429);
  assert.ok((await limited.json()).error.includes("une minute"));
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);
  console.log("PASS: navigation accepts more than 100 requests, then enforces a short limit with a clear JSON response.");

  assert.equal((await request("/auth/session")).status, 200);
  assert.equal((await request("/auth/logout", { method: "POST" })).status, 204);
  assert.equal((await request("/healthz")).status, 200);
  assert.equal((await request("/admin/session")).status, 401);
  console.log("PASS: navigation quota does not block session checks, logout, or health checks.");

  for (const [path, invalidStatus] of [["/auth/login", 400], ["/admin/login", 401]]) {
    for (let i = 0; i < 8; i++) {
      assert.equal((await request(path, { method: "POST", body: "{}" })).status, invalidStatus);
    }
    const rejected = await request(path, { method: "POST", body: "{}" });
    assert.equal(rejected.status, 429);
    assert.ok((await rejected.json()).error.includes("tentatives"));
  }
  console.log("PASS: both login endpoints retain the strict eight-attempt limit.");
} finally {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}