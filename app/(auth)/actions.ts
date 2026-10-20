"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { emailSchema, loginSchema, newPasswordSchema, onboardingSchema, registerSchema } from "@/lib/schemas";

async function siteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData);
  if ("state" in parsed) return { error: "Email ou mot de passe invalide.", values: echoValues(formData) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Message générique : ne révèle pas si le compte existe.
  if (error) return { error: "Email ou mot de passe invalide.", values: echoValues(formData) };
  redirect("/dashboard");
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(registerSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding` },
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("create_tenant", {
    p_name: parsed.data.company,
    p_display_name: parsed.data.displayName,
  });
  if (error) return { error: "Création de l'entreprise impossible (compte déjà rattaché ?).", values: echoValues(formData) };
  redirect("/mfa");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
