import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE, isValidTimeZone, todayIn } from "@/lib/dates";

export type Role = "admin" | "responsable" | "consultation";

export type Session = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  tenant: { id: string; name: string; accent: string; logo_data: string | null; accreditation_label: string; currency: string; buildings: string[] };
  isPlatformAdmin: boolean;
  plan: string;
  planExpiresAt: string | null;
  // Fuseau horaire de l'entreprise (Paramètres) : heures affichées, exports, « aujourd'hui ».
  timeZone: string;
  // Pays de l'entreprise (code ISO), null pour les entreprises créées avant ce choix.
  country: string | null;
  // Essai ou abonnement terminé : consultation seulement, les données sont conservées.
  readOnly: boolean;
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

  // Second facteur validé pour cette session : application d'authentification (aal2) ou code e-mail (même règle que la base).
  const { data: mfaOk } = await supabase.rpc("mfa_ok");
  if (mfaOk !== true) redirect("/mfa");

  // Entreprise bloquée ou abonnement expiré : la base masque ses données, on affiche un message clair.
  const { data: tenant } = await supabase.from("tenants").select("id, name, accent, logo_data, accreditation_label, currency, buildings, plan, plan_expires_at").eq("id", profile.tenant_id).maybeSingle();
  // Lu à part : si la migration 0013 n'est pas encore appliquée, la requête échoue sans bloquer la session (Dakar par défaut).
  const { data: tzRow } = await supabase.from("tenants").select("time_zone, country").eq("id", profile.tenant_id).maybeSingle();
  const tzValue: unknown = tzRow?.time_zone;
  const timeZone = typeof tzValue === "string" && isValidTimeZone(tzValue) ? tzValue : DEFAULT_TIME_ZONE;
  if (!tenant) redirect("/suspendu");
  const { data: platform } = await supabase.rpc("is_platform_admin");

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: profile.display_name,
    role: profile.role as Role,
    tenant,
    isPlatformAdmin: platform === true,
    plan: tenant.plan,
    planExpiresAt: tenant.plan_expires_at,
    timeZone,
    country: typeof tzRow?.country === "string" ? tzRow.country : null,
    readOnly: Boolean(tenant.plan_expires_at && tenant.plan_expires_at < todayIn(timeZone)),
  };
});

// Droit d'écrire = bon rôle ET abonnement valide (la base applique la même règle).
export function canEdit(s: Pick<Session, "role" | "readOnly">): boolean {
  return canWrite(s.role) && !s.readOnly;
}

export function canWrite(role: Role): boolean {
  return role === "admin" || role === "responsable";
}

export const ROLE_LABEL: Record<Role, string> = { admin: "Administrateur", responsable: "Coordinateur", consultation: "Consultation" };

// Admin ou coordinateur : gestion des comptes (un coordinateur ne gère pas les administrateurs).
export async function requireManager(): Promise<Session> {
  const s = await requireSession();
  if (s.role === "consultation") redirect("/dashboard");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await requireSession();
  if (s.role !== "admin") redirect("/dashboard");
  return s;
}

export async function requirePlatformAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!s.isPlatformAdmin) redirect("/dashboard");
  return s;
}
