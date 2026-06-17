"use server";

import { redirect } from "next/navigation";
import { createSession, findUser, verifyPassword } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type LoginState = { error: string };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "E-mail ou senha inválidos." };
    redirect("/app/dashboard");
  }

  const user = findUser(email);
  if (!user || !verifyPassword(password)) {
    return { error: "E-mail ou senha inválidos." };
  }
  await createSession(user);
  redirect("/app/dashboard");
}
