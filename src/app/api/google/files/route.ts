import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getValidAccessToken, listDriveFiles } from "@/lib/google/integration";
import { isGoogleConfigured } from "@/lib/google/oauth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Google OAuth não configurado." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10);

  try {
    const accessToken = await getValidAccessToken(session.id);
    const files = await listDriveFiles(accessToken, {
      query,
      pageSize: Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 100) : 25,
    });
    return NextResponse.json({
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        mime_type: file.mimeType,
        created_time: file.createdTime,
        modified_time: file.modifiedTime,
        size: file.size,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao listar arquivos do Drive.";
    const status = message.includes("não conectada") ? 412 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
