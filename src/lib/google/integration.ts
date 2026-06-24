import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptToken,
  encryptToken,
  fetchGoogleEmail,
  refreshAccessToken,
  revokeAccessToken,
  type GoogleTokenSet,
} from "./oauth";

// Re-fetch a token from the DB this many milliseconds before its expiry.
const REFRESH_WINDOW_MS = 60_000;

type StoredIntegration = {
  user_id: string;
  organization_id: string | null;
  email: string | null;
  scope: string | null;
  access_token: string;       // encrypted
  refresh_token: string | null; // encrypted
  expires_at: string;          // ISO timestamp
};

export async function persistGoogleTokens(
  userId: string,
  tokens: GoogleTokenSet,
  organizationId?: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const payload = {
    user_id: userId,
    organization_id: organizationId ?? null,
    email: tokens.email,
    scope: tokens.scope,
    access_token: encryptToken(tokens.accessToken),
    refresh_token: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
    expires_at: tokens.expiresAt.toISOString(),
    last_refreshed_at: new Date().toISOString(),
    last_error: null,
  };

  const { error } = await supabase
    .from("google_integrations")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(`Falha ao persistir tokens Google: ${error.message}`);
}

export async function getGoogleIntegration(userId: string): Promise<StoredIntegration | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("google_integrations")
    .select("user_id, organization_id, email, scope, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler integração Google: ${error.message}`);
  return (data as StoredIntegration | null) ?? null;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const integration = await getGoogleIntegration(userId);
  if (!integration) throw new Error("Conta Google não conectada.");

  const expiresAt = new Date(integration.expires_at).getTime();
  const stillValid = expiresAt - Date.now() > REFRESH_WINDOW_MS;
  if (stillValid) {
    return decryptToken(integration.access_token);
  }

  if (!integration.refresh_token) {
    throw new Error("Token Google expirado e sem refresh_token. Reconecte a conta.");
  }

  const refresh = decryptToken(integration.refresh_token);
  const refreshed = await refreshAccessToken(refresh);
  const supabase = createAdminClient();

  // If Google did not return a new refresh token, keep the existing one.
  const newRefreshToken =
    refreshed.refreshToken && refreshed.refreshToken !== refresh
      ? encryptToken(refreshed.refreshToken)
      : integration.refresh_token;

  const { error } = await supabase
    .from("google_integrations")
    .update({
      access_token: encryptToken(refreshed.accessToken),
      refresh_token: newRefreshToken,
      expires_at: refreshed.expiresAt.toISOString(),
      last_refreshed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("user_id", userId);

  if (error) throw new Error(`Falha ao gravar token renovado: ${error.message}`);
  return refreshed.accessToken;
}

export async function disconnectGoogle(userId: string): Promise<void> {
  const integration = await getGoogleIntegration(userId);
  if (integration) {
    try {
      const accessToken = decryptToken(integration.access_token);
      await revokeAccessToken(accessToken);
    } catch {
      // Best-effort revoke; the local row is the source of truth.
    }
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("google_integrations").delete().eq("user_id", userId);
  if (error) throw new Error(`Falha ao desconectar Google: ${error.message}`);
}

export async function describeGoogleStatus(userId: string): Promise<{
  connected: boolean;
  email: string | null;
  expiresAt: string | null;
  scope: string | null;
}> {
  const integration = await getGoogleIntegration(userId);
  if (!integration) return { connected: false, email: null, expiresAt: null, scope: null };
  return {
    connected: true,
    email: integration.email,
    expiresAt: integration.expires_at,
    scope: integration.scope,
  };
}

// ---------------------------------------------------------------------
// OAuth state CSRF helpers
// ---------------------------------------------------------------------
export async function storeOAuthState(state: string, userId: string, redirectPath?: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("google_oauth_states").insert({
    state,
    user_id: userId,
    redirect_path: redirectPath ?? null,
  });
  if (error) throw new Error(`Falha ao registrar OAuth state: ${error.message}`);
}

export async function consumeOAuthState(state: string): Promise<{
  userId: string;
  redirectPath: string | null;
} | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("google_oauth_states")
    .select("state, user_id, redirect_path, expires_at")
    .eq("state", state)
    .maybeSingle();
  if (error || !data) return null;
  await supabase.from("google_oauth_states").delete().eq("state", state);

  const expired = new Date(data.expires_at as string).getTime() < Date.now();
  if (expired) return null;
  return {
    userId: data.user_id as string,
    redirectPath: (data.redirect_path as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------
// Google Drive helpers (list + download)
// ---------------------------------------------------------------------
export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string | null;
  modifiedTime: string | null;
  size: number | null;
};

export async function listDriveFiles(
  accessToken: string,
  options: { query?: string; pageSize?: number } = {},
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    pageSize: String(options.pageSize ?? 25),
    fields: "files(id,name,mimeType,createdTime,modifiedTime,size)",
    orderBy: "modifiedTime desc",
  });
  if (options.query) {
    const escaped = options.query.replace(/'/g, "\\'");
    params.set("q", `name contains '${escaped}' and trashed = false`);
  } else {
    params.set("q", "trashed = false");
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive list falhou (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      createdTime?: string;
      modifiedTime?: string;
      size?: string;
    }>;
  };
  return (json.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    createdTime: file.createdTime ?? null,
    modifiedTime: file.modifiedTime ?? null,
    size: file.size ? Number.parseInt(file.size, 10) : null,
  }));
}

export async function downloadDriveFile(accessToken: string, fileId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Drive download falhou (${response.status}): ${text}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mime = response.headers.get("content-type") ?? "application/octet-stream";
  return { buffer, mime };
}

// Re-export a thin wrapper just to keep the name promised in the mission spec.
export async function refreshGoogleEmail(accessToken: string) {
  return fetchGoogleEmail(accessToken);
}
