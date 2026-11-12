import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { IMPORT_COLUMNS, buildImportTemplate, readImportFile, toIsoDate } from "@/lib/import";

// Remplit le modèle officiel avec des lignes, comme le ferait un métrologue dans Excel.
async function filled(rows: Record<string, unknown>[]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await buildImportTemplate()).buffer as never);
  const ws = wb.getWorksheet("Instruments")!;
  // Saisie à partir de la ligne 2, comme dans Excel (les lignes suivantes portent déjà les listes déroulantes).
  rows.forEach((r, i) => IMPORT_COLUMNS.forEach((c, k) => { if (r[c.key] !== undefined) ws.getRow(i + 2).getCell(k + 1).value = r[c.key] as never; }));
  return (await wb.xlsx.writeBuffer()) as never;
}

describe("import Excel du parc", () => {
  it("le modèle contient les colonnes, l'exemple et le mode d'emploi", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await buildImportTemplate()).buffer as never);
    expect(wb.getWorksheet("Instruments")!.getRow(1).getCell(1).value).toBe("Référence *");
    expect(wb.getWorksheet("Exemple")).toBeTruthy();
    expect(wb.getWorksheet("Mode d'emploi")).toBeTruthy();
  });

  it("accepte les lignes valides et convertit dates, unités et types", async () => {
    const r = await readImportFile(await filled([
      { ref: "THM-1", designation: "Thermomètre", catalog_id: "Thermomètre / Sonde Pt100", date_etalonnage: new Date(Date.UTC(2026, 4, 4)), frequence_valeur: 12, frequence_unite: "Mois", conformite: "Oui", tolerance: "± 0,5 °C" },
      { ref: "BAL-2", designation: "Balance", date_etalonnage: "04/05/2026", date_prochaine: "04/05/2027" },
    ]), new Set());
    expect(r.fatal).toBeUndefined();
    expect(r.valid).toBe(2);
    expect(r.rows[0].data).toMatchObject({ ref: "THM-1", date_etalonnage: "2026-05-04", frequence_valeur: 12, frequence_unite: "mois", catalog_id: "thermometre", statut: "En service" });
    expect(r.rows[1].data).toMatchObject({ date_prochaine: "2027-05-04", conformite: "À vérifier" });
  });

  it("signale chaque erreur avec sa ligne, sans bloquer les lignes valides", async () => {
    const r = await readImportFile(await filled([
      { ref: "OK-1", designation: "Bon" },
      { ref: "", designation: "Sans référence" },
      { ref: "OK-1", designation: "Doublon" },
      { ref: "EXI-1", designation: "Déjà là" },
      { ref: "D-1", designation: "Dates", date_etalonnage: "10/05/2026", date_prochaine: "01/01/2026" },
      { ref: "U-1", designation: "Unité", frequence_valeur: 3, frequence_unite: "Siècles" },
      { ref: "S-1", designation: "Statut", statut: "Perdu" },
    ]), new Set(["exi-1"]));
    expect(r.total).toBe(7);
    expect(r.valid).toBe(1);
    const byLine = new Map(r.rows.map((x) => [x.line, x.errors.join(" ")]));
    expect(byLine.get(3)).toMatch(/Référence/);
    expect(byLine.get(4)).toMatch(/double dans le fichier \(ligne 2\)/);
    expect(byLine.get(5)).toMatch(/déjà présente/);
    expect(byLine.get(6)).toMatch(/suivre le dernier étalonnage/);
    expect(byLine.get(7)).toMatch(/Unité de fréquence/);
    expect(byLine.get(8)).toMatch(/Statut/);
  });

  it("refuse un fichier qui n'est pas le modèle", async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Feuil1").addRow(["Nom", "Prix"]);
    const buf = await wb.xlsx.writeBuffer();
    expect((await readImportFile(buf as ArrayBuffer, new Set())).fatal).toMatch(/Référence/);
    expect((await readImportFile(new TextEncoder().encode("pas un excel").buffer as ArrayBuffer, new Set())).fatal).toMatch(/illisible/);
  });

  it("lit les dates françaises", () => {
    expect(toIsoDate("4/5/2026")).toBe("2026-05-04");
    expect(toIsoDate("2026-05-04")).toBe("2026-05-04");
    expect(toIsoDate("46146")).toBe("2026-05-04");
  });
});
