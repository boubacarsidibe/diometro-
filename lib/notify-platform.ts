import "server-only";
import { LEGAL } from "@/lib/legal";
import { isMailConfigured, mailer } from "@/lib/mail";
import { newTenantEmail } from "@/lib/email-template";

/**
 * Prévient le responsable de la plateforme à chaque nouvelle entreprise inscrite (repris de la version locale :
 * notifySuperAdminNewRegistration). Destinataire : PLATFORM_NOTIFY_EMAIL, sinon l'adresse de contact légale.
 * Ne bloque jamais l'inscription : sans serveur d'e-mails ou en cas d'échec, l'envoi est simplement abandonné.
 */
export async function notifyNewTenant(info: { company: string; displayName: string; sector: string; phone: string; userEmail: string; appUrl: string }): Promise<void> {
  const to = process.env.PLATFORM_NOTIFY_EMAIL || LEGAL.email;
  if (!to || !to.includes("@") || !isMailConfigured()) return;
  const when = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Dakar", dateStyle: "long", timeStyle: "short" });
  const lines: [string, string][] = [
    ["Entreprise", info.company], ["Administrateur", info.displayName], ["E-mail", info.userEmail],
    ["Secteur", info.sector || "—"], ["Téléphone", info.phone || "—"], ["Inscription", `${when} (heure de Dakar)`],
  ];
  const mail = newTenantEmail(lines, info.company, info.appUrl.replace(/\/$/, ""));
  try {
    await Promise.race([
      mailer().sendMail({ from: process.env.MAIL_FROM, to, ...mail }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("délai dépassé")), 6000)),
    ]);
  } catch (e) {
    console.error("Alerte de nouvelle inscription non envoyée :", e instanceof Error ? e.message : e);
  }
}
