import { NextResponse } from "next/server";
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
  }
}
