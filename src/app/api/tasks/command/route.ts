import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTasks } from "@/lib/repositories";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const command = String(body.command || "").trim();
  if (!command) return NextResponse.json({ error: "Digite um comando." }, { status: 422 });

  const normalized = command.toLocaleLowerCase("pt-BR");
  if (!normalized.startsWith("crie") && !normalized.startsWith("criar")) {
    const tasks = await getTasks();
    const filtered = normalized.includes("bloque")
      ? tasks.filter((task) => task.status === "Bloqueada")
      : tasks;
    return NextResponse.json({
      response: filtered.length
        ? `${filtered.length} tarefa(s) encontrada(s): ${filtered.slice(0, 5).map((task) => task.title).join("; ")}.`
        : "Nenhuma tarefa correspondente foi encontrada.",
    });
  }

  const title = command
    .replace(/^criar?\s+(uma\s+)?tarefa\s+(para|de)?\s*/i, "")
    .trim();
  if (title.length < 3) return NextResponse.json({ error: "Informe o título da tarefa." }, { status: 422 });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      response: "Tarefa criada no modo de demonstração.",
      task: { id: `task-local-${Date.now()}`, title },
      mode: "demo",
    });
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 403 });

  const { data: task, error } = await supabase.from("tasks").insert({
    organization_id: profile.organization_id,
    title,
    status: "todo",
    priority: "medium",
    creator_id: session.id,
    area: "Geral",
  }).select("id, title").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ response: "Tarefa criada em A Fazer.", task });
}
