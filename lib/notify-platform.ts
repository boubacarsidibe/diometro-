import "server-only";
import { LEGAL } from "@/lib/legal";
import { isMailConfigured, mailer } from "@/lib/mail";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

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
  const text = `Nouvelle inscription sur DIOMETRO\n\n${lines.map(([k, v]) => `${k} : ${v}`).join("\n")}\n\nPlateforme : ${info.appUrl}/admin`;
  const html = `<p><strong>Nouvelle inscription sur DIOMETRO</strong></p><table cellpadding="4">${lines.map(([k, v]) => `<tr><td style="color:#6a5d60">${k}</td><td><strong>${esc(v)}</strong></td></tr>`).join("")}</table>` +
    `<p><a href="${esc(info.appUrl)}/admin">Ouvrir la page Plateforme</a></p>`;
  try {
    await Promise.race([
      mailer().sendMail({ from: process.env.MAIL_FROM, to, subject: `Nouvelle inscription : ${info.company}`, text, html }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("délai dépassé")), 6000)),
    ]);
  } catch (e) {
    console.error("Alerte de nouvelle inscription non envoyée :", e instanceof Error ? e.message : e);
  }
}
