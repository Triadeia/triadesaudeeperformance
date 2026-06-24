import { NextResponse } from "next/server";
<<<<<<< HEAD
import { getSession } from "@/lib/auth";
import { exchangeCodeForTokens, isGoogleConfigured } from "@/lib/google/oauth";
import { consumeOAuthState, disconnectGoogle, persistGoogleTokens } from "@/lib/google/integration";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // OAuth provider redirect (browser navigation).
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google OAuth não configurado." }, { status: 503 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/app/integracoes?google_error=${error}`, url.origin));
  }
  if (!code || !state) {
    return NextResponse.json({ error: "code/state ausentes." }, { status: 400 });
  }

  const consumed = await consumeOAuthState(state);
  if (!consumed) {
    return NextResponse.json({ error: "OAuth state inválido ou expirado." }, { status: 400 });
  }

  let organizationId: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", consumed.userId)
      .maybeSingle();
    organizationId = profile?.organization_id ?? null;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await persistGoogleTokens(consumed.userId, tokens, organizationId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha no callback Google." },
      { status: 502 },
    );
  }

  const redirectPath = consumed.redirectPath || "/app/integracoes";
  return NextResponse.redirect(new URL(`${redirectPath}?google=connected`, url.origin));
}

// POST: callback proxy for SPA flows that exchange the code themselves.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google OAuth não configurado." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { code?: string; state?: string };
  if (!body.code) return NextResponse.json({ error: "code obrigatório." }, { status: 422 });

  if (body.state) {
    const consumed = await consumeOAuthState(body.state);
    if (!consumed || consumed.userId !== session.id) {
      return NextResponse.json({ error: "OAuth state inválido." }, { status: 400 });
    }
  }

  let organizationId: string | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", session.id)
      .maybeSingle();
    organizationId = profile?.organization_id ?? null;
  }

  try {
    const tokens = await exchangeCodeForTokens(body.code);
    await persistGoogleTokens(session.id, tokens, organizationId);
    return NextResponse.json({ success: true, email: tokens.email });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao processar callback." },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  try {
    await disconnectGoogle(session.id);
    return NextResponse.json({ success: true, message: "Conta Google desconectada." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao desconectar Google." },
      { status: 500 },
    );
=======
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { persistGoogleTokens } from "@/lib/google/integration";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=session_expired", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/app/integracoes?google=error&reason=${encodeURIComponent(error)}`, request.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/integracoes?google=error&reason=missing_params", request.url));
  }

  const store = await cookies();
  const expected = store.get("g_oauth_state")?.value;
  if (!expected || expected !== state) {
    return NextResponse.redirect(new URL("/app/integracoes?google=error&reason=state_mismatch", request.url));
  }
  store.delete("g_oauth_state");

  try {
    const tokens = await exchangeCodeForTokens(code);
    await persistGoogleTokens(session.id, tokens);
    return NextResponse.redirect(new URL("/app/integracoes?google=connected", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida";
    return NextResponse.redirect(
      new URL(`/app/integracoes?google=error&reason=${encodeURIComponent(message)}`, request.url),
    );
  }
}

// POST endpoint que aceita { code } via JSON (compatibilidade com SPAs)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    if (!code) return NextResponse.json({ error: "code obrigatório." }, { status: 400 });
    const tokens = await exchangeCodeForTokens(code);
    await persistGoogleTokens(session.id, tokens);
    return NextResponse.json({ connected: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida";
    return NextResponse.json({ error: message }, { status: 500 });
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
  }
}
