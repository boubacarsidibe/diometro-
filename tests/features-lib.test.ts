import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { calendarGrid, currentMonth, groupByDay, monthLabel, parseMonth, shiftMonth } from "@/lib/planning";
import { buildFichePdf, buildInstrumentsPdf, buildInstrumentsXlsx, pdfText, safeCell } from "@/lib/export";
import { escapeHtml, renderAlertEmail, selectAlertItems } from "@/lib/alerts";
import { detectImageMime, logoToDataUri } from "@/lib/image";
import { qrDataUri } from "@/lib/qr";
import { codeEmail, newTenantEmail, planRequestEmail, testEmail } from "@/lib/email-template";
import type { Instrument } from "@/lib/types";

const inst = (o: Partial<Instrument>): Instrument => ({
  id: "i", ref: "R", designation: "D", type_mesure: "", batiment: "", zone: "", statut: "En service",
  date_etalonnage: null, date_prochaine: null, frequence_valeur: null, frequence_unite: null, commentaires: "", deleted_at: null, created_at: "", updated_at: "",
  conformite: "À vérifier", mode_utilisation: "", graduation: "", tolerance: "", proprietaire: "", stockage: "", etalonnage_type: "À définir",
  origine_frequence: "", raccordement: "", fiche_link: "", certificat_link: "", procedure_link: "", prestataire_id: null, catalog_id: "", public_token: null, ...o,
});

describe("planning", () => {
  it("navigue entre les mois et valide l'entrée", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(parseMonth("2026-11")).toBe("2026-11");
    expect(parseMonth("2026-13", new Date(2026, 9, 5))).toBe("2026-10");
    expect(parseMonth("<script>", new Date(2026, 9, 5))).toBe(currentMonth(new Date(2026, 9, 5)));
    expect(monthLabel("2026-02")).toBe("février 2026");
  });
  it("construit la grille (lundi en premier)", () => {
    const g = calendarGrid("2026-11"); // 1er nov. 2026 = dimanche
    expect(g[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
  it("regroupe les échéances par jour", () => {
    const m = groupByDay([inst({ id: "1", date_prochaine: "2026-11-05" }), inst({ id: "2", date_prochaine: "2026-11-05" }), inst({ id: "3", date_prochaine: "2026-12-05" })], "2026-11");
    expect(m.get(5)).toHaveLength(2);
    expect(m.size).toBe(1);
  });
});

describe("exports", () => {
  it("neutralise les injections de formule Excel", () => {
    expect(safeCell("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
    expect(safeCell("+1+1")).toBe("'+1+1");
    expect(safeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(safeCell("-2+3")).toBe("'-2+3");
    expect(safeCell("Normal")).toBe("Normal");
    expect(safeCell(5)).toBe(5);
  });
  it("génère un vrai fichier .xlsx relisible, sans formule exécutable", async () => {
    const buf = await buildInstrumentsXlsx([inst({ ref: "=cmd|' /C calc'!A0", designation: "Thermomètre é" })], "Dioulatech", new Date(2026, 9, 21));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Instruments")!;
    expect(ws.getCell("A4").value).toBe("'=cmd|' /C calc'!A0");
    expect(ws.getCell("B4").value).toBe("Thermomètre é");
    expect(ws.getCell("A3").value).toBe("Référence");
  });
  it("génère des PDF valides, même avec des caractères hors Latin-1 et plusieurs pages", async () => {
    expect(pdfText("Écran – “test” ✓ 日本")).toBe('Écran - "test" ? ??');
    const many = Array.from({ length: 80 }, (_, n) => inst({ id: String(n), ref: `R${n}`, designation: "Désignation ✓ très longue ".repeat(6), date_prochaine: "2026-11-02" }));
    const pdf = await PDFDocument.load(await buildInstrumentsPdf(many, "Entreprise ✓", new Date(2026, 9, 21)));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    const fiche = await PDFDocument.load(await buildFichePdf(inst({ ref: "TH-1" }), [{ id: "x", instrument_id: "i", date: "2026-01-01", type: "Étalonnage", resultat: "Conforme", prestataire: "Labo", ref_certificat: "C1", observation: "ok", created_at: "" }], "Dioulatech"));
    expect(fiche.getPageCount()).toBe(1);
  });
});

describe("alertes par email", () => {
  const now = new Date(2026, 9, 21); // mercredi
  const base = { designation: "D", statut: "En service" };
  it("n'envoie qu'aux jalons, et rappelle les retards le lundi", () => {
    const send = (d: string, n = now) => selectAlertItems([{ ...base, ref: "a", date_prochaine: d }], n).shouldSend;
    expect(send("2026-11-20")).toBe(true);   // J-30
    expect(send("2026-11-05")).toBe(true);   // J-15
    expect(send("2026-10-28")).toBe(true);   // J-7
    expect(send("2026-10-22")).toBe(true);   // J-1
    expect(send("2026-10-21")).toBe(true);   // J
    expect(send("2026-11-01")).toBe(false);  // J-11 : pas un jalon
    expect(send("2026-10-10")).toBe(false);  // retard, mais mercredi
    expect(send("2026-10-10", new Date(2026, 9, 19))).toBe(true); // retard, lundi
    expect(selectAlertItems([{ ...base, ref: "a", date_prochaine: "2026-11-20", statut: "Hors service" }], now).items).toHaveLength(0);
    expect(selectAlertItems([{ ...base, ref: "a", date_prochaine: "2027-05-01" }], now).items).toHaveLength(0);
  });
  it("échappe tout le contenu de l'email", () => {
    const mail = renderAlertEmail('<img src=x onerror=alert(1)>', [{ ref: "<b>R</b>", designation: '"><script>x</script>', date_prochaine: "2026-11-01", statut: "En service", days: 5 }], "https://app.example");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("/email/diometro-logo.png"); // seule image : le logo DIOMETRO
    expect(mail.html).toContain("&lt;b&gt;R&lt;/b&gt;");
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(escapeHtml(`'"<>&`)).toBe("&#39;&quot;&lt;&gt;&amp;");
  });
});

describe("logo et QR", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  it("vérifie la vraie signature du fichier", () => {
    expect(detectImageMime(png)).toBe("image/png");
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(detectImageMime(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageMime(new TextEncoder().encode("<?php system($_GET[1]); ?>"))).toBeNull();
    const ok = logoToDataUri(png);
    expect(ok.ok && ok.dataUri.startsWith("data:image/png;base64,")).toBe(true);
    expect(logoToDataUri(new Uint8Array(200 * 1024)).ok).toBe(false);
    expect(logoToDataUri(new Uint8Array(0)).ok).toBe(false);
  });
  it("génère un QR code PNG", async () => {
    expect((await qrDataUri("https://app.example/instruments/abc")).startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("e-mails habillés", () => {
  it("met le logo, échappe les noms et garde une version texte", () => {
    const c = codeEmail("042517", 10, "https://app.example");
    expect(c.subject).toBe("042517 est votre code de connexion DIOMETRO");
    expect(c.html).toContain("https://app.example/email/diometro-logo.png");
    expect(c.text).toContain("042517");
    const t = testEmail("<b>Awa</b>", 'Labo "X"', "https://app.example");
    expect(t.html).not.toContain("<b>Awa</b>");
    expect(t.html).toContain("&lt;b&gt;Awa&lt;/b&gt;");
    const n = newTenantEmail([["Entreprise", "<script>x</script>"]], "Acme\r\nBcc: x@y.z", "https://app.example");
    expect(n.html).not.toContain("<script>");
    expect(n.subject).not.toMatch(/[\r\n]/);
    const r = planRequestEmail({ company: "Acme", displayName: "A", email: "a@b.c", plan: "Pro", scope: "jusqu'à 500 instruments" }, "https://app.example");
    expect(r.html).toContain("https://app.example/admin");
  });
});
