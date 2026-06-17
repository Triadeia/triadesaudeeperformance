import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { verifyN8nRequest } from "./n8n";

test("accepts a current valid n8n signature", () => {
  process.env.N8N_WEBHOOK_SECRET = "test-secret";
  const body = JSON.stringify({ event: "meeting.processed" });
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", "test-secret")
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const headers = new Headers({
    "x-vp-timestamp": timestamp,
    "x-vp-signature": signature,
  });

  assert.equal(verifyN8nRequest(headers, body), true);
});

test("rejects expired signatures", () => {
  process.env.N8N_WEBHOOK_SECRET = "test-secret";
  const body = "{}";
  const timestamp = String(Date.now() - 6 * 60 * 1000);
  const signature = createHmac("sha256", "test-secret")
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const headers = new Headers({
    "x-vp-timestamp": timestamp,
    "x-vp-signature": signature,
  });

  assert.equal(verifyN8nRequest(headers, body), false);
});
