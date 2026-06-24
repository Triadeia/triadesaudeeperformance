import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGoogleIntegration } from "@/lib/google/integration";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const record = await getGoogleIntegration(session.id);
    if (!record) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      email: record.google_email,
      scope: record.scope,
      expiresAt: record.expires_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ connected: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { disconnectGoogle } = await import("@/lib/google/integration");
  try {
    await disconnectGoogle(session.id);
    return NextResponse.json({ connected: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
