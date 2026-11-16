"use server";

import { cookies, headers } from "next/headers";
import { logSessionEvent } from "@/lib/session-log";
import { redirect } from "next/navigation";
import { createClient, REMEMBER_COOKIE } from "@/lib/supabase/server";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { emailSchema, loginSchema, newPasswordSchema, onboardingSchema, registerSchema } from "@/lib/schemas";
import { notifyNewTenant } from "@/lib/notify-platform";
import { isZoneOfCountry } from "@/lib/timezones";

async function siteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData);
  if ("state" in parsed) return { error: "Email ou mot de passe invalide.", values: echoValues(formData) };
  const persist = formData.get("remember") === "on";
  const store = await cookies();
  // La nouvelle connexion remplace la session précédente éventuelle (autre compte sur le même ordinateur).
  const supabase = await createClient({ persist });
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Message générique : ne révèle pas si le compte existe.
  if (error) return { error: "Email ou mot de passe invalide.", values: echoValues(formData) };
  store.set(REMEMBER_COOKIE, persist ? "1" : "0", { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", ...(persist ? { maxAge: 400 * 24 * 3600 } : {}) });
  redirect("/dashboard");
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(registerSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding`,
      // Preuve d'acceptation des conditions (date et version) conservée avec le compte.
      data: { cgu_accepted_at: new Date().toISOString(), cgu_version: "2026-11-07", formule_choisie: parsed.data.formule },
    },
  });
  if (error && error.status !== 422) {
    // Cause technique dans les logs serveur (jamais d'email ni de mot de passe).
    console.error("signUp refusé", { status: error.status, code: error.code });
    return { error: "Inscription impossible pour le moment. Réessayez plus tard.", values: echoValues(formData) };
  }
  // Confirmation d'email désactivée côté Supabase : la session est déjà ouverte.
  if (data?.session) redirect("/onboarding");
  // Même réponse que le compte existe ou non (anti-énumération).
  return { ok: "Si l'adresse est valide, un email de confirmation vient d'être envoyé." };
}

export async function forgotPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(emailSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/set-password`,
  });
  return { ok: "Si un compte existe, un lien de réinitialisation vient d'être envoyé." };
}

export async function setPassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(newPasswordSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Impossible de changer le mot de passe. Le lien a peut-être expiré." };
  redirect("/dashboard");
}

export async function createCompany(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(onboardingSchema, formData);
  if ("state" in parsed) return parsed.state;
  // Pays obligatoire : il donne l'heure exacte du lieu de l'entreprise.
  const country = String(formData.get("country") ?? "").toUpperCase();
  const tz = String(formData.get("time_zone") ?? "");
  if (!isZoneOfCountry(country, tz)) return { error: "Choisissez le pays de l'entreprise (et la ville s'il y a plusieurs fuseaux).", values: echoValues(formData) };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: tenantId, error } = await supabase.rpc("register_tenant", {
    p_name: parsed.data.company,
    p_display_name: parsed.data.displayName,
    p_sector: parsed.data.sector,
    p_phone: parsed.data.phone,
    p_buildings: parsed.data.buildings,
  });
  if (error) return { error: "Création de l'entreprise impossible (compte déjà rattaché ?).", values: echoValues(formData) };
  // Pays et fuseau (modifiables dans Paramètres) ; sans effet tant que la migration 0013 n'est pas appliquée.
  if (tenantId) await supabase.from("tenants").update({ time_zone: tz, country }).eq("id", tenantId);
  await notifyNewTenant({ company: parsed.data.company, displayName: parsed.data.displayName, sector: parsed.data.sector, phone: parsed.data.phone, userEmail: user.email ?? "", appUrl: await siteUrl() });
  redirect("/mfa");
}

export async function logout() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims as { sub?: string } | undefined)?.sub;
  if (userId) await logSessionEvent(userId, "logout");
  await supabase.auth.signOut();
  redirect("/login");
}
