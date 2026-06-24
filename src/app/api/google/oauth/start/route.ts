import { NextResponse } from "next/server";
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
}
