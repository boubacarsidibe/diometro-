import { daysUntil } from "@/lib/status";
import { fmtDate } from "@/lib/dates";

export type AlertInput = { ref: string; designation: string; date_prochaine: string | null; statut: string };
export type AlertItem = AlertInput & { days: number };

// Jalons d'envoi : J-30, J-15, J-7, J-1 et le jour même. Les retards sont rappelés chaque lundi.
export const MILESTONES = [30, 15, 7, 1, 0] as const;

export function selectAlertItems(items: AlertInput[], now: Date = new Date()): { items: AlertItem[]; shouldSend: boolean } {
  const due: AlertItem[] = [];
  for (const i of items) {
    if (i.statut !== "En service") continue;
    const days = daysUntil(i.date_prochaine, now);
    if (days !== null && days <= 30) due.push({ ...i, days });
  }
  due.sort((a, b) => a.days - b.days);
  const monday = now.getDay() === 1;
  const shouldSend = due.some((i) => (MILESTONES as readonly number[]).includes(i.days) || (i.days < 0 && monday));
  return { items: due, shouldSend };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const when = (d: number) => (d < 0 ? `${-d} j de retard` : d === 0 ? "aujourd'hui" : `dans ${d} j`);

export function renderAlertEmail(tenantName: string, items: AlertItem[], appUrl: string) {
  const subject = `DIOMETRO - ${items.length} instrument(s) à étalonner (${tenantName})`.replace(/[\r\n]+/g, " ");
  const text = [`Bonjour,`, ``, `Instruments à étalonner pour ${tenantName} :`, ...items.map((i) => `- ${i.ref} ${i.designation} : ${fmtDate(i.date_prochaine)} (${when(i.days)})`), ``, `${appUrl}/alerts`].join("\n");
  const rows = items
    .map((i) => `<tr><td style="padding:6px 10px">${escapeHtml(i.ref)}</td><td style="padding:6px 10px">${escapeHtml(i.designation)}</td><td style="padding:6px 10px">${escapeHtml(fmtDate(i.date_prochaine, ""))}</td><td style="padding:6px 10px;color:${i.days < 0 ? "#b91c1c" : "#9a3412"}">${escapeHtml(when(i.days))}</td></tr>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;color:#0b1220"><h2>Instruments à étalonner</h2><p>${escapeHtml(tenantName)}</p><table style="border-collapse:collapse;font-size:14px"><thead><tr><th align="left" style="padding:6px 10px">Réf.</th><th align="left" style="padding:6px 10px">Désignation</th><th align="left" style="padding:6px 10px">Échéance</th><th align="left" style="padding:6px 10px">Délai</th></tr></thead><tbody>${rows}</tbody></table><p><a href="${escapeHtml(appUrl)}/alerts">Ouvrir DIOMETRO</a></p></div>`;
  return { subject, text, html };
}
