import {
  documents as fallbackDocuments,
  employees as fallbackEmployees,
  meetings as fallbackMeetings,
  projects as fallbackProjects,
  tasks as fallbackTasks,
  type Role,
  type TaskStatus,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const taskStatusLabels: Record<string, TaskStatus> = {
  backlog: "Backlog",
  todo: "A Fazer",
  in_progress: "Em andamento",
  review: "Em revisão",
  blocked: "Bloqueada",
  done: "Concluída",
  cancelled: "Cancelada",
};

const taskPriorityLabels: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export async function getEmployees() {
  if (!isSupabaseConfigured()) return fallbackEmployees;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, area, active")
    .order("full_name");
  if (error || !data) return fallbackEmployees;
  return data.map((profile) => ({
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    role: profile.role as Role,
    area: profile.area || "Não definida",
    active: profile.active,
  }));
}

export async function getProjects() {
  if (!isSupabaseConfigured()) return fallbackProjects;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, progress, status, owner:profiles!projects_owner_id_fkey(full_name)")
    .order("updated_at", { ascending: false });
  if (error || !data?.length) return fallbackProjects;
  return data.map((project) => ({
    id: project.id,
    name: project.name,
    owner: (
      (Array.isArray(project.owner) ? project.owner[0] : project.owner) as
        | { full_name?: string }
        | null
    )?.full_name || "Sem responsável",
    progress: project.progress,
    status: project.status,
  }));
}

export async function getMeetings() {
  if (!isSupabaseConfigured()) return fallbackMeetings;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(`
      id, title, starts_at, status, tags,
      participants,
      meeting_participants(display_name),
      meeting_summaries(executive_summary, strategic_summary),
      meeting_decisions(title),
      meeting_insights(kind, title)
    `)
    .order("starts_at", { ascending: false });
  if (error || !data?.length) return fallbackMeetings;

  return data.map((meeting) => {
    const date = meeting.starts_at ? new Date(meeting.starts_at) : null;
    const summaries = Array.isArray(meeting.meeting_summaries)
      ? meeting.meeting_summaries[0]
      : meeting.meeting_summaries;
    return {
      id: meeting.id,
      title: meeting.title,
      date: date
        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date)
        : "Sem data",
      time: date
        ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)
        : "--:--",
      participants: (meeting.meeting_participants || []).map((item) => {
        return item.display_name || "Participante";
      }).concat(meeting.participants || []),
      status: meeting.status === "processed" ? "Processada" : meeting.status === "review" ? "Revisar" : meeting.status,
      tags: meeting.tags || [],
      summary: summaries?.executive_summary || "Resumo ainda não gerado.",
      strategic: summaries?.strategic_summary || "Leitura estratégica ainda não gerada.",
      decisions: (meeting.meeting_decisions || []).map((item) => item.title),
      risks: (meeting.meeting_insights || []).filter((item) => item.kind === "risk").map((item) => item.title),
      opportunities: (meeting.meeting_insights || []).filter((item) => item.kind === "opportunity").map((item) => item.title),
    };
  });
}

export async function getTasks() {
  if (!isSupabaseConfigured()) return fallbackTasks;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, priority, area, due_at, ai_score, assignee:profiles!tasks_assignee_id_fkey(full_name), project:projects(name)")
    .order("created_at", { ascending: false });
  if (error || !data?.length) return fallbackTasks;
  return data.map((task) => {
    const assignee = Array.isArray(task.assignee) ? task.assignee[0] : task.assignee;
    const project = Array.isArray(task.project) ? task.project[0] : task.project;
    return {
      id: task.id,
      title: task.title,
      status: taskStatusLabels[task.status] || "Backlog",
      priority: taskPriorityLabels[task.priority] || "Média",
      assignee: assignee?.full_name || "Sem responsável",
      area: task.area || "Geral",
      project: project?.name || "Sem projeto",
      due: task.due_at
        ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(task.due_at))
        : "Sem prazo",
      score: task.ai_score || 0,
    };
  });
}

export async function getDocuments() {
  if (!isSupabaseConfigured()) return fallbackDocuments;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, document_type, tags")
    .order("created_at", { ascending: false });
  if (error || !data?.length) return fallbackDocuments;
  return data.map((document) => ({
    id: document.id,
    title: document.title,
    type: document.document_type,
    tags: document.tags || [],
  }));
}

export async function getDashboardData() {
  const [meetings, tasks, projects, documents, employees] = await Promise.all([
    getMeetings(),
    getTasks(),
    getProjects(),
    getDocuments(),
    getEmployees(),
  ]);
  return { meetings, tasks, projects, documents, employees };
}
