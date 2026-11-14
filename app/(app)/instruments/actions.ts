"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { instrumentSchema, interventionSchema } from "@/lib/schemas";
import { canEdit, requireSession } from "@/lib/session";
import { addDuration, type FrequenceUnite } from "@/lib/status";
import { syncInstrumentFromInterventions } from "@/lib/conformity";

const LIMIT_MSG = "Limite d'instruments atteinte pour votre formule. Choisissez une formule plus grande dans Paramètres > Abonnement.";
// Si seule la date d'étalonnage et la fréquence sont connues, l'échéance est calculée.
function withNextDate<T extends { date_etalonnage: string | null; date_prochaine: string | null; frequence_valeur: number | null; frequence_unite: string | null }>(d: T): T {
  return !d.date_prochaine && d.date_etalonnage && d.frequence_valeur && d.frequence_unite ? { ...d, date_prochaine: addDuration(d.date_etalonnage, d.frequence_valeur, d.frequence_unite as FrequenceUnite) } : d;
}
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

export async function createInstrument(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canEdit(s)) return { error: "Droits insuffisants." };
  const parsed = parseForm(instrumentSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("instruments")
    .insert({ ...withNextDate(parsed.data), tenant_id: s.tenant.id })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("Limite d'instruments")) return { error: LIMIT_MSG, values: echoValues(formData) };
    return error.code === "23505" ? { fieldErrors: { ref: "Cette référence existe déjà." }, error: "Référence déjà utilisée.", values: echoValues(formData) } : { error: "Enregistrement impossible.", values: echoValues(formData) };
  }
  revalidatePath("/", "layout");
  // Pas de redirection ici : le navigateur envoie d'abord les fichiers choisis, puis ouvre la fiche.
  return { ok: "Instrument créé.", id: data.id };
}

export async function updateInstrument(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canEdit(s) || !idSchema.safeParse(id).success) return { error: "Droits insuffisants." };
  const parsed = parseForm(instrumentSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from("instruments").update(withNextDate(parsed.data)).eq("id", id);
  if (error) return error.code === "23505" ? { fieldErrors: { ref: "Cette référence existe déjà." }, error: "Référence déjà utilisée.", values: echoValues(formData) } : { error: "Mise à jour impossible.", values: echoValues(formData) };
  revalidatePath("/", "layout");
  return { ok: "Instrument mis à jour." };
}

export async function archiveInstrument(id: string) {
  const s = await requireSession();
  if (s.role !== "admin" || !idSchema.safeParse(id).success) redirect("/instruments");
  const supabase = await createClient();
  await supabase.from("instruments").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
  redirect("/instruments?archive=1");
}

export async function addIntervention(instrumentId: string, _: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canEdit(s)) return { error: "Droits insuffisants." };
  const parsed = parseForm(interventionSchema, withInstrument(formData, instrumentId));
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  if (parsed.data.prestataire_id && !parsed.data.prestataire) {
    const { data: p } = await supabase.from("prestataires").select("nom").eq("id", parsed.data.prestataire_id).maybeSingle();
    if (p) parsed.data.prestataire = p.nom;
  }
  const { data: created, error } = await supabase.from("interventions").insert({ ...parsed.data, tenant_id: s.tenant.id, realise_par: s.userId }).select("id").single();
  if (error || !created) return { error: "Enregistrement impossible.", values: echoValues(formData) };

  // Conformité et échéance suivent la dernière intervention métrologique : un étalonnage ou une vérification
  // « Non conforme » rend l'instrument non conforme ; un étalonnage conforme replanifie la prochaine échéance.
  await syncInstrumentFromInterventions(supabase, instrumentId, { mode: "add", interventionId: created.id });
  revalidatePath("/", "layout");
  return { ok: "Intervention enregistrée." };
}

const cancelSchema = z.object({ motif: z.string().trim().min(3, "Indiquez le motif (3 caractères minimum).").max(300) });

// Annulation d'une intervention saisie par erreur : jamais effacée, marquée annulée avec son motif (migration 0012).
export async function cancelIntervention(instrumentId: string, interventionId: string, _: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canEdit(s) || !idSchema.safeParse(instrumentId).success || !idSchema.safeParse(interventionId).success) return { error: "Droits insuffisants." };
  const parsed = cancelSchema.safeParse({ motif: formData.get("motif") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Motif invalide." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("interventions")
    .update({ annulee_at: new Date().toISOString(), annulation_motif: parsed.data.motif }, { count: "exact" })
    .eq("id", interventionId).eq("instrument_id", instrumentId).is("annulee_at", null);
  if (error) {
    // Colonne absente : la migration 0012 n'a pas encore été exécutée dans Supabase.
    if (error.code === "42703" || error.code === "PGRST204") return { error: "Annulation pas encore activée : la mise à jour 0012 de la base de données doit d'abord être appliquée." };
    return { error: "Annulation impossible." };
  }
  if (!count) return { error: "Intervention introuvable ou déjà annulée." };
  const { datesUpdated } = await syncInstrumentFromInterventions(supabase, instrumentId, { mode: "cancel" });
  revalidatePath("/", "layout");
  return { ok: datesUpdated ? "Intervention annulée. Conformité et échéance recalculées." : "Intervention annulée. Conformité recalculée ; vérifiez les dates d'étalonnage de l'instrument." };
}

function withInstrument(formData: FormData, instrumentId: string): FormData {
  const copy = new FormData();
  for (const [k, v] of formData.entries()) copy.append(k, v);
  copy.set("instrument_id", instrumentId);
  return copy;
}
