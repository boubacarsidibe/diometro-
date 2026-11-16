"use server";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { mfaCodeSchema } from "@/lib/schemas";
import { isMailConfigured, mailer, missingMailVars, smtpErrorInfo } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, codeEmail } from "@/lib/email-template";
import { createClient } from "@/lib/supabase/server";
import { logSessionEvent } from "@/lib/session-log";

const VALIDITY_MIN = 10;
const MAX_SENDS_PER_HOUR = 5;
const RESEND_DELAY_S = 60;

export type CodeState = { ok?: string; error?: string; sentAt?: number; expiresAt?: number };

// Identité ET session vérifiées par Supabase (signature du jeton) : jamais déduites d'un cookie non vérifié.
async function currentSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; email?: string; session_id?: string; aal?: string } | undefined;
  if (error || !claims?.sub || !claims.session_id) return null;
  return { supabase, userId: claims.sub, email: claims.email ?? "", sessionId: claims.session_id, aal: claims.aal ?? "" };
}

// Génère un code à 6 chiffres, l'enregistre (empreinte salée seulement) et l'envoie par e-mail.
// Le code n'est jamais renvoyé au navigateur.
export async function sendEmailCode(force = false): Promise<CodeState> {
  const s = await currentSession();
  if (!s) redirect("/login");
  if (!isMailConfigured()) {
    console.error("Code e-mail impossible : envoi d'e-mails non configuré", missingMailVars());
    return { error: "L'envoi d'e-mails n'est pas disponible pour le moment. Utilisez l'application d'authentification." };
  }
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    console.error("Code e-mail impossible : SUPABASE_SERVICE_ROLE_KEY manquante");
    return { error: "L'envoi du code n'est pas disponible pour le moment. Utilisez l'application d'authentification." };
  }
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await admin.from("mfa_email_codes").select("created_at, expires_at, verified_at").eq("user_id", s.userId).gte("created_at", since).order("created_at", { ascending: false });
  const last = recent?.[0];
  // Un code encore valide pour cette connexion vient d'être envoyé : on ne le renvoie pas (rechargement de page).
  if (last && !last.verified_at && !force && Date.now() - new Date(last.created_at).getTime() < RESEND_DELAY_S * 1000) {
    return { ok: "Un code vient de vous être envoyé.", sentAt: new Date(last.created_at).getTime(), expiresAt: new Date(last.expires_at).getTime() };
  }
  if ((recent?.length ?? 0) >= MAX_SENDS_PER_HOUR) {
    return { error: "Trop de codes demandés. Patientez une heure ou utilisez l'application d'authentification." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + VALIDITY_MIN * 60_000);
  const { data: row, error } = await admin.from("mfa_email_codes").insert({
    user_id: s.userId, session_id: s.sessionId, salt, expires_at: expiresAt.toISOString(),
    code_hash: createHash("sha256").update(`${salt}:${code}`).digest("hex"),
  }).select("id").single();
  if (error || !row) {
    console.error("Code e-mail : enregistrement impossible", error?.code);
    return { error: "Impossible de générer un code pour le moment. Réessayez." };
  }
  try {
    await mailer().sendMail({ from: process.env.MAIL_FROM, to: s.email, ...codeEmail(code, VALIDITY_MIN, appBaseUrl()) });
  } catch (e) {
    await admin.from("mfa_email_codes").delete().eq("id", row.id);
    console.error("Code e-mail : envoi refusé", smtpErrorInfo(e).code);
    return { error: "L'e-mail n'a pas pu être envoyé. Réessayez ou utilisez l'application d'authentification." };
  }
  return { ok: "Code envoyé.", sentAt: Date.now(), expiresAt: expiresAt.getTime() };
}

const MESSAGES: Record<string, string> = {
  invalid: "Code incorrect.",
  expired: "Ce code a expiré. Demandez-en un nouveau.",
  locked: "Trop d'essais : ce code est bloqué. Demandez-en un nouveau.",
  none: "Aucun code en attente. Demandez-en un nouveau.",
};

export async function verifyEmailCode(_: CodeState, formData: FormData): Promise<CodeState> {
  const s = await currentSession();
  if (!s) redirect("/login");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!mfaCodeSchema.safeParse(code).success) return { error: "Saisissez le code à 6 chiffres reçu par e-mail." };
  const { data, error } = await s.supabase.rpc("mfa_email_verify", { p_code: code });
  if (error) return { error: "Vérification impossible pour le moment. Réessayez." };
  if (data !== "ok") {
    await logSessionEvent(s.userId, "login_failed", { methode: "Code par e-mail", motif: String(data) });
    return { error: MESSAGES[String(data)] ?? MESSAGES.invalid };
  }
  await s.supabase.rpc("set_mfa_method", { p_method: "email" });
  await logSessionEvent(s.userId, "login", { methode: "Code par e-mail" });
  redirect("/dashboard");
}

// Après validation par l'application d'authentification : mémorise ce choix pour les prochaines connexions.
export async function rememberTotp(): Promise<void> {
  const s = await currentSession();
  if (!s) return;
  await s.supabase.rpc("set_mfa_method", { p_method: "totp" });
  // Journalisé seulement si la double authentification est réellement validée (jeton aal2 signé).
  if (s.aal === "aal2") await logSessionEvent(s.userId, "login", { methode: "Application d'authentification" });
}
