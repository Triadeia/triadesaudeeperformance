/**
 * Repositório Supabase para tarefas.
 * Substitui localStorage quando Supabase está configurado.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase não configurado - usando fallback localStorage");
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "Backlog" | "A Fazer" | "Em andamento" | "Em revisão" | "Bloqueada" | "Concluída" | "Cancelada";
  priority?: "Urgente" | "Alta" | "Média" | "Baixa";
  assignee?: string;
  project?: string;
  area?: string;
  due_date?: string;
  score?: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

type TaskQueryFilters = Partial<Pick<Task, "status" | "priority" | "assignee">>;

export const supabaseTasksRepository = {
  async getTasks(filters?: TaskQueryFilters) {
    if (!supabase) return [];
    try {
      let query = supabase.from("tasks").select("*");
      
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.priority) query = query.eq("priority", filters.priority);
      if (filters?.assignee) query = query.eq("assignee", filters.assignee);
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ Erro ao buscar tarefas:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("❌ Erro no repositório:", e);
      return [];
    }
  },

  async addTask(task: Omit<Task, "id" | "created_at" | "updated_at">) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([task])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("❌ Erro ao criar tarefa:", e);
      return null;
    }
  },

  async updateTask(id: string, changes: Partial<Task>) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update(changes)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (e) {
      console.error("❌ Erro ao atualizar tarefa:", e);
      return null;
    }
  },

  async deleteTask(id: string) {
    if (!supabase) return false;
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("❌ Erro ao deletar tarefa:", e);
      return false;
    }
  }
};
