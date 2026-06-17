import { createHmac, timingSafeEqual } from "node:crypto";

const signatureHeader = "x-vp-signature";
const timestampHeader = "x-vp-timestamp";

function signature(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifyN8nRequest(headers: Headers, body: string) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const suppliedSignature = headers.get(signatureHeader);
  const timestamp = headers.get(timestampHeader);
  if (!secret || !suppliedSignature || !timestamp) return false;

  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;

  const expected = Buffer.from(signature(secret, timestamp, body));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function dispatchN8nEvent(event: string, payload: Record<string, unknown>) {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return { dispatched: false, reason: "not_configured" as const };

  const body = JSON.stringify({ event, payload, sentAt: new Date().toISOString() });
  const timestamp = String(Date.now());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [signatureHeader]: signature(secret, timestamp, body),
        [timestampHeader]: timestamp,
      },
      body,
      signal: controller.signal,
    });
    return { dispatched: response.ok, status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}
