"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseClient();
    await supabase.auth.signOut();
  } else {
    await deleteSession();
  }
  redirect("/login");
}
