import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Redirections autorisées (liste blanche) : pas de redirection ouverte.
const NEXT_ALLOWED = new Set(["/onboarding", "/set-password", "/dashboard"]);
const TYPES = new Set(["email", "signup", "invite", "recovery", "magiclink", "email_change"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const requested = searchParams.get("next") ?? "";
  const next = NEXT_ALLOWED.has(requested) ? requested : type === "recovery" || type === "invite" ? "/set-password" : "/onboarding";

  if (tokenHash && type && TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
