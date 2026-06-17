import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      redirectTo.pathname = "/app/dashboard";
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "Não foi possível confirmar o acesso.");
  return NextResponse.redirect(redirectTo);
}
