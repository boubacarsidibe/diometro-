// Import du parc depuis un fichier Excel : modèle à télécharger, lecture et contrôle ligne par ligne.
// Les règles de validation sont exactement celles du formulaire « Nouvel instrument » (instrumentSchema).
import ExcelJS from "exceljs";
import { CATALOG } from "@/lib/calc/catalog";
import { CONFORMITES, ETALONNAGE_TYPES, STATUTS, instrumentSchema } from "@/lib/schemas";

type Column = { key: string; header: string; width: number; help: string; list?: readonly string[] };

const UNITS: Record<string, string> = { jours: "jour", jour: "jour", "jour(s)": "jour", semaines: "semaine", semaine: "semaine", "semaine(s)": "semaine", mois: "mois", années: "annee", annees: "annee", année: "annee", annee: "annee", ans: "annee", an: "annee", "an(s)": "annee" };
const UNIT_LIST = ["Jours", "Semaines", "Mois", "Années"] as const;
const CATALOG_NAMES = CATALOG.filter((c) => c.id !== "autre").map((c) => c.nom);

export const IMPORT_COLUMNS: Column[] = [
  { key: "ref", header: "Référence *", width: 16, help: "Obligatoire, unique dans votre parc (ex. THM-007)." },
  { key: "designation", header: "Désignation *", width: 30, help: "Obligatoire (ex. Thermomètre Pt100)." },
  { key: "catalog_id", header: "Type d'instrument", width: 24, help: "Un type du catalogue (liste) : active la procédure et le calculateur.", list: CATALOG_NAMES },
  { key: "type_mesure", header: "Type de mesure", width: 18, help: "Ex. Température, Masse, Pression." },
  { key: "statut", header: "Statut", width: 16, help: "En service (par défaut), Hors service, En réparation, Réformé.", list: STATUTS },
  { key: "batiment", header: "Bâtiment", width: 16, help: "Ex. Laboratoire." },
  { key: "zone", header: "Zone", width: 16, help: "Ex. Paillasse 2." },
  { key: "stockage", header: "Lieu de stockage", width: 18, help: "Ex. Armoire C." },
  { key: "proprietaire", header: "Responsable", width: 18, help: "Personne ou service responsable." },
  { key: "date_etalonnage", header: "Dernier étalonnage", width: 16, help: "Date jj/mm/aaaa." },
  { key: "date_prochaine", header: "Prochaine échéance", width: 16, help: "Date jj/mm/aaaa. Laissez vide pour la calculer (dernier étalonnage + fréquence)." },
  { key: "frequence_valeur", header: "Fréquence", width: 11, help: "Nombre entier (ex. 12). À remplir avec l'unité." },
  { key: "frequence_unite", header: "Unité de fréquence", width: 16, help: "Jours, Semaines, Mois ou Années.", list: UNIT_LIST },
  { key: "conformite", header: "Conformité", width: 13, help: "Oui, Non ou À vérifier (par défaut).", list: CONFORMITES },
  { key: "tolerance", header: "Tolérance / EMT", width: 16, help: "Ex. ± 0,5 °C. Reprise par les calculateurs." },
  { key: "graduation", header: "Graduation / résolution", width: 18, help: "Ex. 0,01 °C." },
  { key: "etalonnage_type", header: "Type d'étalonnage", width: 18, help: "Interne, Externe, Interne et externe, À définir.", list: ETALONNAGE_TYPES },
  { key: "raccordement", header: "Raccordement / traçabilité", width: 22, help: "Ex. COFRAC." },
  { key: "commentaires", header: "Commentaires", width: 30, help: "Texte libre." },
];

// ── Modèle à télécharger ──────────────────────────────────────────────────
export async function buildImportTemplate(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DIOMETRO";
  const ws = wb.addWorksheet("Instruments", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  head.height = 22;
  IMPORT_COLUMNS.forEach((c, i) => {
    head.getCell(i + 1).note = c.help;
    const letter = ws.getColumn(i + 1).letter;
    if (c.list) {
      // Liste déroulante (les valeurs longues passent par une feuille cachée).
      for (let r = 2; r <= 2000; r++) ws.getCell(`${letter}${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`Listes!$${letter}$1:$${letter}$${c.list.length}`] };
    }
    if (c.key.startsWith("date_")) for (let r = 2; r <= 2000; r++) ws.getCell(`${letter}${r}`).numFmt = "dd/mm/yyyy";
  });
  const lists = wb.addWorksheet("Listes", { state: "veryHidden" });
  IMPORT_COLUMNS.forEach((c, i) => c.list?.forEach((v, k) => (lists.getCell(k + 1, i + 1).value = v)));

  const ex = wb.addWorksheet("Exemple");
  ex.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  ex.getRow(1).font = { bold: true };
  ex.addRow({ ref: "THM-007", designation: "Thermomètre Pt100", catalog_id: CATALOG_NAMES.find((n) => /Pt100/.test(n)) ?? "", type_mesure: "Température", statut: "En service", batiment: "Laboratoire", zone: "Paillasse 2", stockage: "Armoire C", proprietaire: "Service qualité", date_etalonnage: new Date(Date.UTC(2026, 4, 4)), date_prochaine: null, frequence_valeur: 12, frequence_unite: "Mois", conformite: "Oui", tolerance: "± 0,5 °C", graduation: "0,01 °C", etalonnage_type: "Externe", raccordement: "COFRAC", commentaires: "Sonde de référence du bain." });
  ex.getCell("J2").numFmt = "dd/mm/yyyy";

  const help = wb.addWorksheet("Mode d'emploi");
  help.getColumn(1).width = 28;
  help.getColumn(2).width = 90;
  help.addRow(["Import du parc DIOMETRO"]).font = { bold: true, size: 14 };
  help.addRow(["1.", "Remplissez la feuille « Instruments », une ligne par instrument (voir la feuille « Exemple »)."]);
  help.addRow(["2.", "Seules la référence et la désignation sont obligatoires. Les dates s'écrivent jj/mm/aaaa."]);
  help.addRow(["3.", "Dans DIOMETRO, menu Instruments > Importer : chargez le fichier, lisez le contrôle, puis confirmez."]);
  help.addRow(["4.", "Aucune ligne n'est importée tant que vous n'avez pas confirmé. Les lignes en erreur sont signalées et ignorées."]);
  help.addRow([]);
  help.addRow(["Colonne", "Contenu attendu"]).font = { bold: true };
  for (const c of IMPORT_COLUMNS) help.addRow([c.header, c.help]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

// ── Lecture d'un fichier rempli ───────────────────────────────────────────
export type ImportRow = { line: number; ref: string; designation: string; data?: Record<string, unknown>; errors: string[] };
export type ImportReport = { total: number; valid: number; rows: ImportRow[]; fatal?: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const HEADER_INDEX = new Map(IMPORT_COLUMNS.map((c) => [norm(c.header.replace("*", "")), c.key]));
const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return iso(v);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v).trim();
}

// jj/mm/aaaa, jj-mm-aaaa, aaaa-mm-jj → aaaa-mm-jj ; sinon renvoyé tel quel (le schéma signalera l'erreur).
export function toIsoDate(s: string): string {
  const t = s.trim();
  // Date saisie dans une cellule sans format date : Excel la stocke en nombre de jours depuis le 30/12/1899.
  if (/^\d{5}(\.\d+)?$/.test(t)) return iso(new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86_400_000));
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return t;
}

const LABEL = new Map(IMPORT_COLUMNS.map((c) => [c.key, c.header.replace(" *", "")]));

export async function readImportFile(buffer: ArrayBuffer, existingRefs: Set<string>): Promise<ImportReport> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { total: 0, valid: 0, rows: [], fatal: "Fichier illisible : utilisez le modèle Excel (.xlsx) fourni." };
  }
  const ws = wb.getWorksheet("Instruments") ?? wb.worksheets[0];
  if (!ws) return { total: 0, valid: 0, rows: [], fatal: "Le fichier ne contient aucune feuille." };
  const keys: (string | undefined)[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => (keys[col] = HEADER_INDEX.get(norm(cellText(cell.value).replace("*", "")))));
  if (!keys.includes("ref") || !keys.includes("designation")) {
    return { total: 0, valid: 0, rows: [], fatal: "Colonnes « Référence » et « Désignation » introuvables en première ligne : utilisez le modèle fourni." };
  }
  const catalogByName = new Map(CATALOG.map((c) => [norm(c.nom), c.id]));
  const seen = new Map<string, number>();
  const rows: ImportRow[] = [];
  ws.eachRow({ includeEmpty: false }, (row, line) => {
    if (line === 1) return;
    const raw: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => { const k = keys[col]; if (k) raw[k] = cellText(cell.value); });
    if (Object.values(raw).every((v) => !v)) return; // ligne vide
    const errors: string[] = [];
    const rec: Record<string, string> = {};
    for (const c of IMPORT_COLUMNS) rec[c.key] = raw[c.key] ?? "";
    rec.statut ||= "En service";
    rec.conformite ||= "À vérifier";
    rec.etalonnage_type ||= "À définir";
    rec.date_etalonnage = rec.date_etalonnage ? toIsoDate(rec.date_etalonnage) : "";
    rec.date_prochaine = rec.date_prochaine ? toIsoDate(rec.date_prochaine) : "";
    if (rec.frequence_valeur) rec.frequence_valeur = rec.frequence_valeur.replace(",", ".");
    if (rec.frequence_unite) {
      const u = UNITS[norm(rec.frequence_unite).replace(/ /g, "")] ?? UNITS[rec.frequence_unite.toLowerCase()];
      if (u) rec.frequence_unite = u; else errors.push(`Unité de fréquence : « ${rec.frequence_unite} » inconnue (Jours, Semaines, Mois ou Années).`);
    }
    if (rec.catalog_id) {
      const id = catalogByName.get(norm(rec.catalog_id));
      if (id) rec.catalog_id = id; else errors.push(`Type d'instrument : « ${rec.catalog_id} » absent du catalogue.`);
    }
    const parsed = instrumentSchema.safeParse(rec);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "");
        const msg = /Invalid option|Invalid enum/i.test(issue.message) ? "valeur non reconnue" : issue.message;
        errors.push(`${LABEL.get(k) ?? k} : ${msg}`);
      }
    }
    const ref = rec.ref.trim();
    const key = ref.toLowerCase();
    if (ref && existingRefs.has(key)) errors.push(`Référence « ${ref} » déjà présente dans votre parc.`);
    if (ref && seen.has(key)) errors.push(`Référence « ${ref} » en double dans le fichier (ligne ${seen.get(key)}).`);
    if (ref) seen.set(key, line);
    rows.push({ line, ref, designation: rec.designation, errors: [...new Set(errors)], data: errors.length === 0 && parsed.success ? parsed.data : undefined });
  });
  return { total: rows.length, valid: rows.filter((r) => r.errors.length === 0).length, rows };
}
