"use server";
import { appBaseUrl, quoteRequestEmail } from "@/lib/email-template";
import { devisLines, parseDevis, type DevisResult } from "@/lib/devis";
import { LEGAL } from "@/lib/legal";
import { isMailConfigured, mailer, smtpErrorInfo } from "@/lib/mail";

export type DevisState = {
  errors?: DevisResult["errors"];
  error?: string;
  ok?: boolean;
  // Envoi par e-mail indisponible : la demande est préparée pour la messagerie du visiteur.
  fallback?: { to: string; subject: string; body: string };
  // Valeurs saisies, renvoyées en cas d'erreur pour ne rien faire retaper.
  values?: Record<string, string | string[]>;
  n?: number;
};

export async function sendDevis(prev: DevisState, fd: FormData): Promise<DevisState> {
  const n = (prev.n ?? 0) + 1;
  const values: Record<string, string | string[]> = {};
  for (const k of new Set(fd.keys())) if (k !== "site_web" && !k.startsWith("$")) values[k] = k === "familles" ? fd.getAll(k).map(String) : String(fd.get(k) ?? "").slice(0, 2000);
  // Champ piège invisible : rempli seulement par les robots.
  if (String(fd.get("site_web") ?? "")) return { ok: true };
  const { data, errors } = parseDevis(fd);
  if (!data) return { errors, values, n };
  const lines = devisLines(data);
  const to = LEGAL.email;
  const mail = quoteRequestEmail(lines, data.entreprise, appBaseUrl());
  if (to && isMailConfigured()) {
    try {
      await mailer().sendMail({ from: process.env.MAIL_FROM, to, replyTo: data.email, ...mail });
      return { ok: true };
    } catch (e) {
      console.error("Demande de devis : envoi refusé", smtpErrorInfo(e).code);
    }
  }
  if (!to) return { error: "La demande n'a pas pu être envoyée. Réessayez plus tard.", values, n };
  return { fallback: { to, subject: mail.subject, body: mail.text } };
}
