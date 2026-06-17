import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { employees, type Role } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const demoPasswordHash =
  "ccfc51319c24567cc2ba7a632dc358972d9b4bef97346be376c4aae654c9650ff0bfd838f0e32902ef49421af8f7519d64737909b0bd7c552151f55e82a2988a";
const salt = "verificapix-demo-2026";
const cookieName = "tsp_session";

export type SessionUser = { id: string; name: string; email: string; role: Role };

function secret() {
  return process.env.AUTH_SECRET || "development-only-change-with-env";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verifyPassword(password: string) {
  const supplied = scryptSync(password, salt, 64);
  const expected = Buffer.from(demoPasswordHash, "hex");
  return timingSafeEqual(supplied, expected);
}

export function findUser(email: string): SessionUser | undefined {
  const employee = employees.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.active);
  if (!employee) return undefined;
  return { id: employee.id, name: employee.name, email: employee.email, role: employee.role };
}

export async function createSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, expiresAt: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(cookieName, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(cookieName);
}

export async function getSession(): Promise<SessionUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, active")
      .eq("id", userId)
      .eq("active", true)
      .single();

    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      role: profile.role as Role,
    };
  }

  const store = await cookies();
  const value = store.get(cookieName)?.value;
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionUser & { expiresAt: number };
    if (session.expiresAt < Date.now()) return null;
    return { id: session.id, name: session.name, email: session.email, role: session.role };
  } catch {
    return null;
  }
}
