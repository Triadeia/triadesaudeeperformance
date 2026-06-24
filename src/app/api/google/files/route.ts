import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
<<<<<<< HEAD
import { getValidAccessToken, listDriveFiles } from "@/lib/google/integration";
import { isGoogleConfigured } from "@/lib/google/oauth";
=======
import { getValidAccessToken } from "@/lib/google/integration";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
};
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
<<<<<<< HEAD
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
=======

  const accessToken = await getValidAccessToken(session.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google não conectado.", reason: "not_connected" },
      { status: 412 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "trashed = false";
  const pageSize = searchParams.get("pageSize") || "20";
  const pageToken = searchParams.get("pageToken") || undefined;

  const params = new URLSearchParams({
    q,
    pageSize,
    fields: "nextPageToken, files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)",
    orderBy: "modifiedTime desc",
  });
  if (pageToken) params.set("pageToken", pageToken);

  try {
    const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: `Google Drive: ${resp.status} ${text}` }, { status: 502 });
    }
    const data = (await resp.json()) as { files: DriveFile[]; nextPageToken?: string };
    return NextResponse.json({ files: data.files || [], nextPageToken: data.nextPageToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar arquivos";
    return NextResponse.json({ error: message }, { status: 500 });
>>>>>>> 59b2649fbc9d8fc283a5fdc1aa06150c2b0912d8
  }
}
