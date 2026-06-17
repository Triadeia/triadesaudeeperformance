import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SEED_USER_PASSWORD;

if (!url || !secretKey || !password) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e SEED_USER_PASSWORD.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const organizationId = "00000000-0000-4000-8000-000000000001";
const users = [
  ["Nilton", "nilton@verificapix.local", "owner", "Direção"],
  ["Luigi", "luigi@verificapix.local", "admin", "Operação"],
  ["João", "joao@verificapix.local", "manager", "Tecnologia"],
  ["Gustavo", "gustavo@verificapix.local", "member", "Marketing"],
  ["Quezia", "quezia@verificapix.local", "member", "Branding"],
  ["Daniel", "daniel@verificapix.local", "member", "Produto"],
] as const;

for (const [fullName, email, role, area] of users) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  let user = listed.users.find((candidate) => candidate.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { organization_id: organizationId, role },
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    organization_id: organizationId,
    full_name: fullName,
    email,
    role,
    area,
    active: true,
  });
  if (profileError) throw profileError;
}

console.log("Usuários e perfis de demonstração criados.");
