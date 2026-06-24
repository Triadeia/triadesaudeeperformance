import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptToken,
  encryptToken,
  fetchGoogleUserEmail,
  refreshAccessToken,
  type GoogleTokenResponse,
} from "@/lib/google/oauth";

export type GoogleIntegrationRecord = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expires_at: string | null;
  google_email: string | null;
};

export async function persistGoogleTokens(userId: string, tokens: GoogleTokenResponse) {
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const email = await fetchGoogleUserEmail(tokens.access_token);

  const record = {
    user_id: userId,
    access_token: encryptToken(tokens.access_token),
    refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expires_at: expiresAt,
    google_email: email ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("google_integrations")
    .upsert(record, { onConflict: "user_id" });
  if (error) throw error;
}

export async function getGoogleIntegration(userId: string): Promise<GoogleIntegrationRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("google_integrations")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as GoogleIntegrationRecord | null;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const record = await getGoogleIntegration(userId);
  if (!record) return null;

  const expiresAt = record.expires_at ? new Date(record.expires_at).getTime() : 0;
  const isExpired = expiresAt - Date.now() < 60_000; // 1 min de margem

  if (!isExpired) {
    try {
      return decryptToken(record.access_token);
    } catch {
      return null;
    }
  }

  if (!record.refresh_token) return null;

  try {
    const refresh = decryptToken(record.refresh_token);
    const tokens = await refreshAccessToken(refresh);
    // Google nem sempre devolve refresh_token de novo: mantemos o existente
    const merged: GoogleTokenResponse = {
      ...tokens,
      refresh_token: tokens.refresh_token || refresh,
    };
    await persistGoogleTokens(userId, merged);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function disconnectGoogle(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("google_integrations")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}
