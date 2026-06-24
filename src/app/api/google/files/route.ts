import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

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
  }
}
