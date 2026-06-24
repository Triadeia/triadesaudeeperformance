import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// =====================================================================
// Google OAuth helpers
// =====================================================================
// - Tokens are encrypted with AES-256-GCM before being persisted.
// - The encryption key is derived from AUTH_SECRET (scrypt) so the
//   secret never leaves env vars and rotation is a config change.
// - Encoded payload: base64(iv ‖ authTag ‖ ciphertext).
//   IV is 12 bytes (GCM standard), authTag is 16 bytes.
// =====================================================================

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const KEY_SALT = "google-oauth-token-encryption-v1";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
  email: string | null;
};

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, KEY_SALT, KEY_LENGTH);
}

function getEncryptionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET ausente ou muito curto (>= 16 chars). Não é possível cifrar tokens Google.",
    );
  }
  return secret;
}

export function encryptToken(plain: string, secret: string = getEncryptionSecret()): string {
  if (!plain) return "";
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(payload: string, secret: string = getEncryptionSecret()): string {
  if (!payload) return "";
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Payload Google cifrado é inválido.");
  }
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const key = deriveKey(secret);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function generateOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth não configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    state,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenSet> {
  const { clientId, clientSecret, redirectUri } = getGoogleCredentials();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google rejeitou o code (${response.status}): ${text}`);
  }

  const json = (await response.json()) as GoogleTokenResponse;
  const email = await fetchGoogleEmail(json.access_token).catch(() => null);

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    scope: json.scope ?? null,
    email,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<Omit<GoogleTokenSet, "email"> & { email?: string | null }> {
  const { clientId, clientSecret } = getGoogleCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao renovar token Google (${response.status}): ${text}`);
  }

  const json = (await response.json()) as GoogleTokenResponse;
  return {
    accessToken: json.access_token,
    // Google does not always return a new refresh token on refresh.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    scope: json.scope ?? null,
  };
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { email?: string };
  return json.email ?? null;
}

export async function revokeAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
}
