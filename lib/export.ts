import ExcelJS from "exceljs";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { URGENCY_LABEL, daysUntil, describeFrequence, urgencyOf } from "@/lib/status";
import type { Instrument, Intervention } from "@/lib/types";
import { fmtDate } from "@/lib/dates";

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
    .replace(/→/g, "->")
    .replace(/[  ]/g, " ")
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
  ws.addRow([`Export du ${fmtDate(now.toISOString())}`]);
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
  ws.addRow(["Date (heure de Dakar)", "Utilisateur", "Action", "Objet", "Détail"]).font = { bold: true };
  for (const r of rows) ws.addRow([r.created_at, safeCell(r.user), safeCell(r.action), safeCell(r.entity), safeCell(r.entity_id)]);
  ws.columns.forEach((c, i) => (c.width = [20, 24, 30, 32, 60][i]));
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
    c.page.drawText(pdfText(`Édité le ${fmtDate(now.toISOString())} - ${instruments.length} instrument(s)`), { x: 40, y: c.y - 16, size: 9, font: c.font, color: rgb(0.4, 0.45, 0.5) });
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

// Découpe un texte en lignes qui tiennent dans la largeur donnée (aucun texte coupé au bord de la page).
function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of String(text ?? "").split(/\r?\n/)) {
    let line = "";
    for (const word of pdfText(para).split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) { line = next; continue; }
      if (line) out.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line);
  }
  return out.length ? out : [""];
}

export type FicheTenant = { name: string; logo_data?: string | null; accreditation_label?: string };

export async function buildFichePdf(instrument: Instrument, interventions: Intervention[], tenantInfo: string | FicheTenant, now: Date = new Date()): Promise<Uint8Array> {
  const tenant: FicheTenant = typeof tenantInfo === "string" ? { name: tenantInfo } : tenantInfo;
  const c = await newDoc(false);
  const M = 40;
  const blue = rgb(0.11, 0.31, 0.85);
  const grey = rgb(0.4, 0.45, 0.5);
  const ensure = (needed: number) => {
    if (c.y - needed < 50) { c.page = c.doc.addPage([c.w, c.h]); c.y = c.h - 50; }
  };

  // En-tête : logo de l'entreprise (PNG ou JPEG), nom, date d'édition.
  let textX = M;
  const logo = tenant.logo_data ?? "";
  try {
    const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(logo);
    if (m) {
      const bytes = Uint8Array.from(Buffer.from(m[2], "base64"));
      const img = m[1] === "png" ? await c.doc.embedPng(bytes) : await c.doc.embedJpg(bytes);
      const scale = Math.min(110 / img.width, 40 / img.height);
      c.page.drawImage(img, { x: M, y: c.y - 40 + 12, width: img.width * scale, height: img.height * scale });
      textX = M + img.width * scale + 14;
    }
  } catch { /* logo illisible : on continue sans */ }
  c.page.drawText(pdfText(tenant.name), { x: textX, y: c.y, size: 13, font: c.bold });
  c.page.drawText(pdfText(`Fiche de vie de l'instrument - éditée le ${fmtDate(now.toISOString())}`), { x: textX, y: c.y - 15, size: 9, font: c.font, color: grey });
  c.y -= 44;
  c.page.drawLine({ start: { x: M, y: c.y }, end: { x: c.w - M, y: c.y }, thickness: 1, color: blue });
  c.y -= 26;
  c.page.drawText(fit(c.bold, `${instrument.ref} - ${instrument.designation}`, 16, c.w - 2 * M), { x: M, y: c.y, size: 16, font: c.bold, color: blue });
  c.y -= 24;

  const urgency = urgencyOf(instrument.date_prochaine);
  const late = daysUntil(instrument.date_prochaine);
  const line = (label: string, value: string) => {
    const rows = wrap(c.font, value || "-", 10, c.w - 2 * M - 150);
    ensure(rows.length * 13 + 4);
    c.page.drawText(pdfText(label), { x: M, y: c.y, size: 9, font: c.bold, color: grey });
    rows.forEach((r, i) => c.page.drawText(r, { x: M + 150, y: c.y - i * 13, size: 10, font: c.font }));
    c.y -= rows.length * 13 + 4;
  };
  const section = (title: string) => {
    ensure(40);
    c.y -= 8;
    c.page.drawText(pdfText(title), { x: M, y: c.y, size: 12, font: c.bold });
    c.y -= 18;
  };

  section("Identification");
  line("Type de mesure", instrument.type_mesure);
  line("Localisation", [instrument.batiment, instrument.zone].filter(Boolean).join(" / "));
  line("Lieu de stockage", instrument.stockage);
  line("Propriétaire / responsable", instrument.proprietaire);
  line("Statut", instrument.statut);

  section("Caractéristiques métrologiques");
  line("Tolérance / EMT", instrument.tolerance);
  line("Graduation / résolution", instrument.graduation);
  line("Conformité", instrument.conformite);
  if (instrument.conformite === "Oui" && urgency === "expire") line("Attention", "Échéance dépassée : la conformité n'est plus garantie tant que l'instrument n'est pas réétalonné.");
  line("Type d'étalonnage", instrument.etalonnage_type);
  line("Raccordement / traçabilité", instrument.raccordement);

  section("Étalonnage et échéances");
  line("Dernier étalonnage", fmtDate(instrument.date_etalonnage, "-"));
  line("Prochaine échéance", `${fmtDate(instrument.date_prochaine, "-")}${late !== null ? ` (${late < 0 ? `${-late} j de retard` : `dans ${late} j`}) - ${URGENCY_LABEL[urgency]}` : ""}`);
  line("Fréquence d'étalonnage", describeFrequence(instrument.frequence_valeur, instrument.frequence_unite));
  if (instrument.commentaires) line("Commentaires", instrument.commentaires);

  section(`Historique des interventions (${interventions.length})`);
  if (!interventions.length) { c.page.drawText("Aucune intervention enregistrée.", { x: M, y: c.y, size: 10, font: c.font }); c.y -= 14; }
  for (const it of interventions) {
    const detail = [it.prestataire && `Prestataire : ${it.prestataire}`, it.ref_certificat && `Certificat : ${it.ref_certificat}`, it.observation && `Observation : ${it.observation}`].filter(Boolean).join("\n");
    const rows = detail ? wrap(c.font, detail, 9, c.w - 2 * M - 12) : [];
    ensure(16 + rows.length * 12 + 8);
    c.page.drawText(fit(c.bold, `${fmtDate(it.date, "-")}   ${it.type}   ${it.resultat}`, 10, c.w - 2 * M), { x: M, y: c.y, size: 10, font: c.bold });
    c.y -= 14;
    rows.forEach((r) => { c.page.drawText(r, { x: M + 12, y: c.y, size: 9, font: c.font, color: rgb(0.3, 0.33, 0.4) }); c.y -= 12; });
    c.y -= 6;
  }

  // Pied de page numéroté sur chaque page.
  const pages = c.doc.getPages();
  pages.forEach((p, i) => p.drawText(pdfText(`${tenant.name} - ${instrument.ref} - page ${i + 1} / ${pages.length}`), { x: M, y: 24, size: 8, font: c.font, color: grey }));
  return c.doc.save();
}

export async function buildAuditPdf(
  rows: { created_at: string; user: string; action: string; entity: string; entity_id: string }[],
  tenantName: string,
  now: Date = new Date(),
): Promise<Uint8Array> {
  const c = await newDoc(true);
  const cols = [{ label: "Date (Dakar)", w: 95 }, { label: "Utilisateur", w: 120 }, { label: "Action", w: 165 }, { label: "Objet", w: 165 }, { label: "Détail", w: 225 }];
  const header = () => {
    c.page.drawText(pdfText(`${tenantName} - Journal d'audit`), { x: 40, y: c.y, size: 15, font: c.bold, color: rgb(0.11, 0.31, 0.85) });
    c.page.drawText(pdfText(`Édité le ${fmtDate(now.toISOString())} - ${rows.length} action(s)`), { x: 40, y: c.y - 16, size: 9, font: c.font, color: rgb(0.4, 0.45, 0.5) });
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
    [r.created_at, r.user, r.action, r.entity, r.entity_id].forEach((t, idx) => {
      c.page.drawText(fit(c.font, t, 9, cols[idx].w - 8), { x, y: c.y, size: 9, font: c.font });
      x += cols[idx].w;
    });
    c.y -= 14;
  }
  return c.doc.save();
}
