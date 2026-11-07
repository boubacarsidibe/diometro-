import ExcelJS from "exceljs";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { URGENCY_LABEL, daysUntil, describeFrequence, urgencyOf } from "@/lib/status";
import type { Instrument, Intervention } from "@/lib/types";

// Anti « injection de formule » : une cellule qui commence par = + - @ est neutralisée.
export function safeCell(value: unknown): string | number {
  if (typeof value === "number") return value;
  const s = value == null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

// Helvetica (WinAnsi) ne sait écrire que le Latin-1 : on remplace le reste pour ne pas faire échouer l'export.
export function pdfText(value: unknown): string {
  return String(value ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ]/g, "?");
}

const HEADERS = ["Référence", "Désignation", "Type de mesure", "Bâtiment", "Zone", "Statut", "Dernier étalonnage", "Prochaine échéance", "Jours restants", "État", "Conformité", "Type d'étalonnage", "Propriétaire", "Tolérance / EMT", "Stockage"];

export function instrumentRows(instruments: Instrument[], now: Date = new Date()): (string | number)[][] {
  return instruments.map((i) => {
    const d = daysUntil(i.date_prochaine, now);
    return [
      safeCell(i.ref), safeCell(i.designation), safeCell(i.type_mesure), safeCell(i.batiment), safeCell(i.zone), safeCell(i.statut),
      i.date_etalonnage ?? "", i.date_prochaine ?? "", d ?? "", URGENCY_LABEL[urgencyOf(i.date_prochaine, now)],
      safeCell(i.conformite), safeCell(i.etalonnage_type), safeCell(i.proprietaire), safeCell(i.tolerance), safeCell(i.stockage),
    ];
  });
}

export async function buildInstrumentsXlsx(instruments: Instrument[], tenantName: string, now: Date = new Date()): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DIOMETRO";
  wb.created = now;
  const ws = wb.addWorksheet("Instruments", { views: [{ state: "frozen", ySplit: 3 }] });
  ws.addRow([safeCell(`${tenantName} — Parc d'instruments`)]).font = { bold: true, size: 14 };
  ws.addRow([`Export du ${now.toISOString().slice(0, 10)}`]);
  const head = ws.addRow(HEADERS);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }));
  for (const r of instrumentRows(instruments, now)) ws.addRow(r);
  ws.columns.forEach((c, idx) => (c.width = [14, 34, 18, 16, 14, 14, 18, 18, 14, 14, 14, 18, 18, 16, 18][idx] ?? 14));
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: HEADERS.length } };
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export async function buildAuditXlsx(
  rows: { created_at: string; user: string; action: string; entity: string; entity_id: string }[],
  tenantName: string,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DIOMETRO";
  const ws = wb.addWorksheet("Audit trail");
  ws.addRow([safeCell(`${tenantName} — Journal d'audit`)]).font = { bold: true, size: 14 };
  ws.addRow(["Date (UTC)", "Utilisateur", "Action", "Objet", "Identifiant"]).font = { bold: true };
  for (const r of rows) ws.addRow([r.created_at, safeCell(r.user), safeCell(r.action), safeCell(r.entity), safeCell(r.entity_id)]);
  ws.columns.forEach((c, i) => (c.width = [24, 24, 14, 16, 40][i]));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

type Ctx = { doc: PDFDocument; page: PDFPage; font: PDFFont; bold: PDFFont; y: number; w: number; h: number };

async function newDoc(landscape: boolean) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [w, h] = landscape ? [841.89, 595.28] : [595.28, 841.89];
  const page = doc.addPage([w, h]);
  return { doc, font, bold, page, y: h - 50, w, h } as Ctx;
}

function fit(font: PDFFont, text: string, size: number, maxWidth: number): string {
  let t = pdfText(text);
  while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -1);
  return t;
}

export async function buildInstrumentsPdf(instruments: Instrument[], tenantName: string, now: Date = new Date()): Promise<Uint8Array> {
  const c = await newDoc(true);
  const cols = [
    { label: "Référence", w: 90 }, { label: "Désignation", w: 220 }, { label: "Localisation", w: 150 },
    { label: "Statut", w: 80 }, { label: "Échéance", w: 80 }, { label: "État", w: 80 },
  ];
  const header = () => {
    c.page.drawText(pdfText(`${tenantName} - Parc d'instruments`), { x: 40, y: c.y, size: 15, font: c.bold, color: rgb(0.11, 0.31, 0.85) });
    c.page.drawText(pdfText(`Édité le ${now.toISOString().slice(0, 10)} - ${instruments.length} instrument(s)`), { x: 40, y: c.y - 16, size: 9, font: c.font, color: rgb(0.4, 0.45, 0.5) });
    c.y -= 40;
    let x = 40;
    for (const col of cols) { c.page.drawText(pdfText(col.label), { x, y: c.y, size: 9, font: c.bold }); x += col.w; }
    c.y -= 6;
    c.page.drawLine({ start: { x: 40, y: c.y }, end: { x: c.w - 40, y: c.y }, thickness: 0.8, color: rgb(0.8, 0.82, 0.86) });
    c.y -= 14;
  };
  header();
  for (const i of instruments) {
    if (c.y < 50) { c.page = c.doc.addPage([c.w, c.h]); c.y = c.h - 50; header(); }
    const u = urgencyOf(i.date_prochaine, now);
    const cells = [i.ref, i.designation, [i.batiment, i.zone].filter(Boolean).join(" / ") || "-", i.statut, i.date_prochaine ?? "-", URGENCY_LABEL[u]];
    let x = 40;
    cells.forEach((t, idx) => {
      const colour = idx === 5 && (u === "expire" || u === "urgent") ? rgb(0.78, 0.15, 0.15) : rgb(0.1, 0.12, 0.18);
      c.page.drawText(fit(c.font, t, 9, cols[idx].w - 8), { x, y: c.y, size: 9, font: c.font, color: colour });
      x += cols[idx].w;
    });
    c.y -= 15;
  }
  return c.doc.save();
}

export async function buildFichePdf(instrument: Instrument, interventions: Intervention[], tenantName: string): Promise<Uint8Array> {
  const c = await newDoc(false);
  const line = (label: string, value: string) => {
    c.page.drawText(pdfText(label), { x: 40, y: c.y, size: 9, font: c.bold, color: rgb(0.4, 0.45, 0.5) });
    c.page.drawText(fit(c.font, value || "-", 10, c.w - 220), { x: 170, y: c.y, size: 10, font: c.font });
    c.y -= 16;
  };
  c.page.drawText(pdfText(`${tenantName} - Fiche de vie`), { x: 40, y: c.y, size: 15, font: c.bold, color: rgb(0.11, 0.31, 0.85) });
  c.y -= 30;
  line("Référence", instrument.ref); line("Désignation", instrument.designation); line("Type de mesure", instrument.type_mesure);
  line("Localisation", [instrument.batiment, instrument.zone].filter(Boolean).join(" / ")); line("Statut", instrument.statut);
  line("Dernier étalonnage", instrument.date_etalonnage ?? ""); line("Prochaine échéance", instrument.date_prochaine ?? "");
  line("Fréquence d'étalonnage", describeFrequence(instrument.frequence_valeur, instrument.frequence_unite)); line("Commentaires", instrument.commentaires);
  c.y -= 14;
  c.page.drawText("Historique des interventions", { x: 40, y: c.y, size: 12, font: c.bold });
  c.y -= 20;
  if (!interventions.length) c.page.drawText("Aucune intervention enregistrée.", { x: 40, y: c.y, size: 10, font: c.font });
  for (const it of interventions) {
    if (c.y < 60) { c.page = c.doc.addPage([c.w, c.h]); c.y = c.h - 50; }
    c.page.drawText(fit(c.font, `${it.date}  ${it.type}  ${it.resultat}`, 10, c.w - 80), { x: 40, y: c.y, size: 10, font: c.bold });
    c.y -= 13;
    const detail = [it.prestataire && `Prestataire : ${it.prestataire}`, it.ref_certificat && `Certificat : ${it.ref_certificat}`, it.observation].filter(Boolean).join(" - ");
    if (detail) { c.page.drawText(fit(c.font, detail, 9, c.w - 90), { x: 52, y: c.y, size: 9, font: c.font, color: rgb(0.3, 0.33, 0.4) }); c.y -= 13; }
    c.y -= 4;
  }
  return c.doc.save();
}

export async function buildAuditPdf(
  rows: { created_at: string; user: string; action: string; entity: string; entity_id: string }[],
  tenantName: string,
  now: Date = new Date(),
): Promise<Uint8Array> {
  const c = await newDoc(true);
  const cols = [{ label: "Date (UTC)", w: 140 }, { label: "Utilisateur", w: 170 }, { label: "Action", w: 110 }, { label: "Objet", w: 200 }, { label: "Identifiant", w: 150 }];
  const header = () => {
    c.page.drawText(pdfText(`${tenantName} - Journal d'audit`), { x: 40, y: c.y, size: 15, font: c.bold, color: rgb(0.11, 0.31, 0.85) });
    c.page.drawText(pdfText(`Édité le ${now.toISOString().slice(0, 10)} - ${rows.length} action(s)`), { x: 40, y: c.y - 16, size: 9, font: c.font, color: rgb(0.4, 0.45, 0.5) });
    c.y -= 40;
    let x = 40;
    for (const col of cols) { c.page.drawText(pdfText(col.label), { x, y: c.y, size: 9, font: c.bold }); x += col.w; }
    c.y -= 6;
    c.page.drawLine({ start: { x: 40, y: c.y }, end: { x: c.w - 40, y: c.y }, thickness: 0.8, color: rgb(0.8, 0.82, 0.86) });
    c.y -= 14;
  };
  header();
  for (const r of rows) {
    if (c.y < 50) { c.page = c.doc.addPage([c.w, c.h]); c.y = c.h - 50; header(); }
    let x = 40;
    [r.created_at.replace("T", " ").slice(0, 19), r.user, r.action, r.entity, r.entity_id.slice(0, 18)].forEach((t, idx) => {
      c.page.drawText(fit(c.font, t, 9, cols[idx].w - 8), { x, y: c.y, size: 9, font: c.font });
      x += cols[idx].w;
    });
    c.y -= 14;
  }
  return c.doc.save();
}
