import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { describeGoogleStatus } from "@/lib/google/integration";
import { isGoogleConfigured } from "@/lib/google/oauth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

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
  }
}
