import { NextResponse } from "next/server";
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
}
