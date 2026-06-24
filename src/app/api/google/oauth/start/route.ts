import { NextResponse } from "next/server";
<<<<<<< HEAD
import { getSession } from "@/lib/auth";
import { generateOAuthState, getAuthorizationUrl, isGoogleConfigured } from "@/lib/google/oauth";
import { storeOAuthState } from "@/lib/google/integration";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth não está configurado neste ambiente." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const redirectPath = url.searchParams.get("redirect") || "/app/integracoes";
  const state = generateOAuthState();
  await storeOAuthState(state, session.id, redirectPath);

  const target = getAuthorizationUrl(state);
  // Allow XHR callers to pick up the URL, but default to a 302.
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ url: target, state });
  }
  return NextResponse.redirect(target);
=======
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const state = randomBytes(16).toString("base64url");
  const store = await cookies();
  store.set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  try {
    const url = buildGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth não configurado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
}
