import "server-only";
import nodemailer from "nodemailer";

export const MAIL_VARS = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"] as const;

// Noms (jamais les valeurs) des variables d'envoi d'email manquantes.
export function missingMailVars(): string[] {
  return MAIL_VARS.filter((n) => !process.env[n]);
}

export function isMailConfigured(): boolean {
  return missingMailVars().length === 0;
}

// Message d'erreur SMTP lisible, sans identifiants : code de réponse du serveur + texte.
export function smtpErrorInfo(e: unknown): { code: string; message: string } {
  const err = e as { responseCode?: number; code?: string; message?: string };
  return { code: String(err?.responseCode ?? err?.code ?? "ERREUR"), message: String(err?.message ?? "Erreur d'envoi").slice(0, 300) };
}

export function mailer() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
