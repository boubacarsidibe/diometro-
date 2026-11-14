import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDuration, type FrequenceUnite } from "@/lib/status";

// Interventions qui disent si l'instrument mesure juste (comme dans la version locale : applyCalibrationConformity).
const METROLOGIQUES = ["Étalonnage", "Vérification"];
const CONFORMITE_OF_RESULTAT: Record<string, "Oui" | "À vérifier" | "Non"> = {
  "Conforme": "Oui",
  "Conforme avec réserve": "À vérifier",
  "Non conforme": "Non",
};
const UNITES_DATEES: string[] = ["jour", "semaine", "mois", "annee"];

type Row = { id: string; date: string; created_at: string; type: string; resultat: string; annulee_at?: string | null };

/**
 * Met la conformité et les dates d'étalonnage d'un instrument en accord avec ses interventions non annulées.
 * - Après un AJOUT (mode "add", avec l'id de la nouvelle intervention) : la conformité ne change que si la nouvelle
 *   intervention est la plus récente ; les dates n'avancent que si son étalonnage est plus récent que la date connue.
 *   Une intervention antidatée n'écrase donc jamais une information plus récente.
 * - Après une ANNULATION (mode "cancel") : tout est recalculé à partir des interventions restantes ; s'il n'en reste
 *   aucune, la conformité repasse « À vérifier » et les dates restent telles quelles (à vérifier par l'utilisateur).
 * Un instrument réformé garde sa conformité. La colonne annulee_at (migration 0012) est lue si elle existe.
 */
export async function syncInstrumentFromInterventions(
  supabase: SupabaseClient, instrumentId: string, opts: { mode: "add"; interventionId: string } | { mode: "cancel" },
): Promise<{ datesUpdated: boolean }> {
  const { data: inst } = await supabase.from("instruments").select("statut, date_etalonnage, frequence_valeur, frequence_unite").eq("id", instrumentId).maybeSingle();
  if (!inst) return { datesUpdated: false };
  const { data } = await supabase.from("interventions").select("*").eq("instrument_id", instrumentId)
    .order("date", { ascending: false }).order("created_at", { ascending: false });
  const rows = ((data ?? []) as Row[]).filter((r) => !r.annulee_at && METROLOGIQUES.includes(r.type));

  const update: Record<string, unknown> = {};
  if (inst.statut !== "Réformé") {
    if (opts.mode === "cancel") update.conformite = rows.length ? CONFORMITE_OF_RESULTAT[rows[0].resultat] ?? "À vérifier" : "À vérifier";
    else if (rows[0]?.id === opts.interventionId) update.conformite = CONFORMITE_OF_RESULTAT[rows[0].resultat] ?? "À vérifier";
  }

  const lastCal = rows.find((r) => r.type === "Étalonnage" && r.resultat !== "Non conforme");
  const datable = Boolean(inst.frequence_valeur && inst.frequence_unite && UNITES_DATEES.includes(inst.frequence_unite));
  const forward = opts.mode === "cancel" || !inst.date_etalonnage || (lastCal && lastCal.date >= inst.date_etalonnage);
  let datesUpdated = false;
  if (lastCal && datable && forward && (opts.mode === "cancel" || lastCal.id === opts.interventionId)) {
    update.date_etalonnage = lastCal.date;
    update.date_prochaine = addDuration(lastCal.date, inst.frequence_valeur as number, inst.frequence_unite as FrequenceUnite);
    datesUpdated = true;
  }
  if (Object.keys(update).length) await supabase.from("instruments").update(update).eq("id", instrumentId);
  return { datesUpdated };
}
