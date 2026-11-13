"use server";

import { revalidatePath } from "next/cache";
import { readImportFile, type ImportReport } from "@/lib/import";
import { canEdit, requireSession } from "@/lib/session";
import { addDuration, type FrequenceUnite } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

// 4 Mo : Vercel refuse les requêtes de plus de 4,5 Mo avant même d'atteindre l'action.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ROWS = 2000;

export type ImportResult = ImportReport & { capacity?: string; inserted?: number; failed?: { line: number; ref: string; error: string }[] };

async function analyse(formData: FormData): Promise<{ report: ImportResult; supabase?: Awaited<ReturnType<typeof createClient>>; tenantId?: string }> {
  const s = await requireSession();
  if (!canEdit(s)) return { report: { total: 0, valid: 0, rows: [], fatal: "Droits insuffisants : l'import est réservé aux administrateurs et coordinateurs." } };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { report: { total: 0, valid: 0, rows: [], fatal: "Choisissez un fichier Excel (.xlsx)." } };
  if (file.size > MAX_BYTES) return { report: { total: 0, valid: 0, rows: [], fatal: "Fichier trop volumineux (4 Mo maximum)." } };
  if (!/\.xlsx$/i.test(file.name)) return { report: { total: 0, valid: 0, rows: [], fatal: "Format non pris en charge : enregistrez le fichier au format Excel .xlsx." } };
  const supabase = await createClient();
  // Les références archivées comptent aussi : une référence reste unique dans l'entreprise.
  const [{ data: refs }, { data: tenant }, { count: active }] = await Promise.all([
    supabase.from("instruments").select("ref").limit(20000),
    supabase.from("tenants").select("max_instruments").eq("id", s.tenant.id).single(),
    supabase.from("instruments").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);
  const report: ImportResult = await readImportFile(await file.arrayBuffer(), new Set((refs ?? []).map((r) => String(r.ref).toLowerCase())));
  if (!report.fatal && report.total > MAX_ROWS) report.fatal = `Le fichier contient ${report.total} lignes : importez au plus ${MAX_ROWS} instruments à la fois.`;
  const max = tenant?.max_instruments ?? null;
  if (max !== null && (active ?? 0) + report.valid > max) {
    report.capacity = `Votre formule autorise ${max} instruments actifs ; vous en avez déjà ${active ?? 0}. ${Math.max(0, max - (active ?? 0))} ligne(s) au plus pourront être importées. Choisissez une formule plus grande dans Paramètres > Abonnement.`;
  }
  return { report, supabase, tenantId: s.tenant.id };
}

// Étape 1 : contrôle du fichier, rien n'est enregistré.
export async function checkImport(_: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const { report } = await analyse(formData);
  return report;
}

// Étape 2 : import des lignes valides (le fichier est relu et recontrôlé).
export async function runImport(_: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const { report, supabase, tenantId } = await analyse(formData);
  if (report.fatal || !supabase || !tenantId) return report;
  const failed: { line: number; ref: string; error: string }[] = [];
  let inserted = 0;
  for (const r of report.rows) {
    if (!r.data) continue;
    const d = r.data as Record<string, unknown> & { date_etalonnage: string | null; date_prochaine: string | null; frequence_valeur: number | null; frequence_unite: string | null };
    const row = !d.date_prochaine && d.date_etalonnage && d.frequence_valeur && d.frequence_unite
      ? { ...d, date_prochaine: addDuration(d.date_etalonnage, d.frequence_valeur, d.frequence_unite as FrequenceUnite) } : d;
    const { error } = await supabase.from("instruments").insert({ ...row, tenant_id: tenantId });
    if (!error) { inserted++; continue; }
    const msg = error.message.includes("Limite d'instruments") ? "limite d'instruments de votre formule atteinte"
      : error.code === "23505" ? "référence déjà utilisée" : "enregistrement refusé";
    failed.push({ line: r.line, ref: r.ref, error: msg });
  }
  revalidatePath("/", "layout");
  return { ...report, inserted, failed };
}
