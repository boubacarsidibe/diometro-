import { daysUntil } from "@/lib/status";
import { fmtDate } from "@/lib/dates";
import { BRAND, emailLayout, escapeHtml } from "@/lib/email-template";

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

export { escapeHtml };

const when = (d: number) => (d < 0 ? `${-d} j de retard` : d === 0 ? "aujourd'hui" : `dans ${d} j`);

// Couleur de la pastille selon l'urgence : retard (rouge), 7 jours ou moins (orange), 30 jours ou moins (jaune).
function urgency(d: number) {
  if (d < 0) return { fg: BRAND.red, bg: BRAND.redBg };
  if (d <= 7) return { fg: BRAND.amber, bg: BRAND.amberBg };
  return { fg: BRAND.yellow, bg: BRAND.yellowBg };
}

export function renderAlertEmail(tenantName: string, items: AlertItem[], appUrl: string, timeZone?: string) {
  const subject = `DIOMETRO · ${items.length} instrument${items.length > 1 ? "s" : ""} à étalonner (${tenantName})`.replace(/[\r\n]+/g, " ");
  const late = items.filter((i) => i.days < 0).length;
  const soon = items.filter((i) => i.days >= 0 && i.days <= 7).length;
  const later = items.length - late - soon;
  const text = [`Bonjour,`, ``, `Instruments à étalonner pour ${tenantName} :`, ...items.map((i) => `- ${i.ref} ${i.designation} : ${fmtDate(i.date_prochaine, "—", timeZone)} (${when(i.days)})`), ``, `${appUrl}/alerts`].join("\n");
  const tile = (n: number, label: string, c: { fg: string; bg: string }) =>
    `<td width="33%" style="padding:0 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${c.bg};border-radius:12px;padding:12px 10px;text-align:center;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="font-size:24px;font-weight:800;color:${c.fg};line-height:1.1">${n}</div><div style="font-size:12px;color:${c.fg};margin-top:2px;white-space:nowrap">${label}</div></td></tr></table></td>`;
  const tiles = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr>${tile(late, "en retard", urgency(-1))}${tile(soon, "sous 7 j", urgency(3))}${tile(later, "sous 30 j", urgency(20))}</tr></table>`;
  const th = (t: string, align = "left") => `<th align="${align}" style="padding:9px 0;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.muted};font-weight:700;border-bottom:2px solid ${BRAND.line}">${t}</th>`;
  const rows = items
    .map((i) => {
      const c = urgency(i.days);
      return `<tr><td style="padding:10px 10px 10px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top"><div style="font-weight:700;color:${BRAND.wineDeep}">${escapeHtml(i.ref)}</div><div style="color:${BRAND.muted};font-size:13px">${escapeHtml(i.designation)}</div></td>` +
        `<td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top;white-space:nowrap"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${c.bg};color:${c.fg};font-size:12.5px;font-weight:700">${escapeHtml(when(i.days))}</span><div style="color:${BRAND.muted};font-size:12.5px;margin-top:4px">${escapeHtml(fmtDate(i.date_prochaine, "—", timeZone))}</div></td></tr>`;
    })
    .join("");
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px">${"<tr>" + th("Instrument") + th("Échéance", "right") + "</tr>"}${rows}</table>`;
  const body = `<p style="margin:0 0 12px">Bonjour,</p><p style="margin:0 0 14px">Voici les instruments de <strong>${escapeHtml(tenantName)}</strong> dont l'étalonnage arrive à échéance ou est dépassé.</p>` + tiles + table;
  const html = emailLayout({
    appUrl, preheader: `${late ? `${late} en retard, ` : ""}${items.length} instrument${items.length > 1 ? "s" : ""} à planifier`,
    kicker: "Alertes d'échéance", title: "Instruments à étalonner", body,
    cta: { label: "Voir les alertes", url: `${appUrl}/alerts` },
    reason: `Vous recevez cet e-mail car vous êtes administrateur ou responsable chez ${tenantName} et les alertes d'échéance sont activées dans les Paramètres.`,
  });
  return { subject, text, html };
}
