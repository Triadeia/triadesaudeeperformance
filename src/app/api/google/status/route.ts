import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
<<<<<<< HEAD
import { describeGoogleStatus } from "@/lib/google/integration";
import { isGoogleConfigured } from "@/lib/google/oauth";
=======
import { getGoogleIntegration } from "@/lib/google/integration";
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

<<<<<<< HEAD
  if (!isGoogleConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      email: null,
      expires_at: null,
      message: "Configure GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI no servidor.",
    });
  }

  try {
    const status = await describeGoogleStatus(session.id);
    return NextResponse.json({
      configured: true,
      connected: status.connected,
      email: status.email,
      expires_at: status.expiresAt,
      scope: status.scope,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao consultar status Google." },
      { status: 500 },
    );
=======
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
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
  }
}
