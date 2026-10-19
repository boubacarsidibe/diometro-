import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "responsable" | "consultation";

export type Session = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  tenant: { id: string; name: string; accent: string };
};

// Contrôle d'accès côté serveur (défense en profondeur : la base applique aussi la RLS).
export const requireSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, active, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");
  if (!profile.active) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") redirect("/mfa");

  const { data: tenant } = await supabase.from("tenants").select("id, name, accent").eq("id", profile.tenant_id).single();
  if (!tenant) redirect("/login");

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile.display_name,
    role: profile.role as Role,
    tenant,
  };
});

export function canWrite(role: Role): boolean {
  return role === "admin" || role === "responsable";
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== "admin") redirect("/dashboard");
  return s;
}
