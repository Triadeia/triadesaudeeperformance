import { NextResponse } from "next/server";
import { verifyN8nRequest } from "@/lib/n8n";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyN8nRequest(request.headers, rawBody)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const organizationId = String(body.organizationId || "");
  const operation = String(body.operation || body.event || "n8n.callback");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId obrigatório." }, { status: 422 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("sync_logs").insert({
      organization_id: organizationId,
      provider: "n8n",
      operation,
      entity_type: body.entityType ? String(body.entityType) : null,
      entity_id: body.entityId ? String(body.entityId) : null,
      status: body.status === "failed" ? "failed" : "success",
      request_id: request.headers.get("x-request-id"),
      input_summary: { source: "n8n" },
      output_summary: body.result && typeof body.result === "object" ? body.result : {},
      error_message: body.error ? String(body.error) : null,
      finished_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } catch {
    return NextResponse.json({ accepted: true, persisted: false });
  }

  return NextResponse.json({ accepted: true, persisted: true });
}
