"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { catalogById } from "@/lib/calc/catalog";
import { computeDirect } from "@/lib/calc/direct";
import { CONFORMITE_OF, RESULTAT_OF, describeDirect, describePipette, describePt100 } from "@/lib/calc/describe";
import { computePipette } from "@/lib/calc/pipette";
import { computePt100, type Verdict } from "@/lib/calc/pt100";
import { CALC_KINDS, directSchema, pipetteSchema, pt100Schema } from "@/lib/calc/schemas";
import { canWrite, requireSession } from "@/lib/session";
import { addMonths } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

type SaveResult = { ok: true; verdict: Verdict } | { ok: false; error: string };

// Le navigateur n'envoie que les SAISIES : le résultat est recalculé ici, jamais accepté tel quel.
export async function saveCalculation(instrumentId: string, kind: string, payload: unknown): Promise<SaveResult> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { ok: false, error: "Droits insuffisants." };
  if (!z.uuid().safeParse(instrumentId).success || !(CALC_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Requête invalide." };

  const supabase = await createClient();
  const { data: inst } = await supabase.from("instruments").select("id, statut, frequence_mois, catalog_id").eq("id", instrumentId).is("deleted_at", null).maybeSingle();
  if (!inst) return { ok: false, error: "Instrument introuvable." };

  let verdict: Verdict;
  let description: string;
  let calcul: unknown;
  if (kind === "pipette") {
    const p = pipetteSchema.safeParse(payload);
    if (!p.success) return { ok: false, error: "Saisies invalides (valeurs hors limites)." };
    const r = computePipette(p.data);
    if (!r) return { ok: false, error: "Saisissez au moins 2 masses et les conditions." };
    verdict = r.conforme ? "ok" : "no";
    description = describePipette(p.data, r);
    calcul = { input: p.data, result: r };
  } else if (kind === "pt100") {
    const p = pt100Schema.safeParse(payload);
    if (!p.success) return { ok: false, error: "Saisies invalides (valeurs hors limites)." };
    const r = computePt100(p.data);
    if (!r) return { ok: false, error: "Saisissez au moins un point complet (2 mesures minimum)." };
    verdict = r.global;
    description = describePt100(p.data, r);
    calcul = { input: p.data, result: r };
  } else {
    const p = directSchema.safeParse(payload);
    if (!p.success) return { ok: false, error: "Saisies invalides (valeurs hors limites)." };
    const r = computeDirect(p.data);
    if (!r) return { ok: false, error: "Saisissez l'EMT et au moins un point complet." };
    verdict = r.global;
    description = describeDirect(p.data, r, catalogById(inst.catalog_id)?.nom ?? "instrument");
    calcul = { input: p.data, result: r };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("interventions").insert({
    tenant_id: s.tenant.id, instrument_id: inst.id, date: today, type: "Étalonnage", resultat: RESULTAT_OF[verdict], mode: "Interne",
    observation: description.slice(0, 2000), realise_par: s.userId, calcul_type: kind, calcul,
  });
  if (error) return { ok: false, error: "Enregistrement impossible." };

  // Conformité mise à jour automatiquement (sauf instrument réformé) ; dates replanifiées si le résultat n'est pas « non conforme ».
  const update: Record<string, unknown> = {};
  if (inst.statut !== "Réformé") update.conformite = CONFORMITE_OF[verdict];
  if (verdict !== "no" && inst.frequence_mois) {
    update.date_etalonnage = today;
    update.date_prochaine = addMonths(today, inst.frequence_mois);
  }
  if (Object.keys(update).length) await supabase.from("instruments").update(update).eq("id", inst.id);

  revalidatePath("/", "layout");
  return { ok: true, verdict };
}
