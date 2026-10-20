"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { instrumentSchema, interventionSchema } from "@/lib/schemas";
import { canWrite, requireSession } from "@/lib/session";
import { addMonths } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

export async function createInstrument(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { error: "Droits insuffisants." };
  const parsed = parseForm(instrumentSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("instruments")
    .insert({ ...parsed.data, tenant_id: s.tenant.id })
    .select("id")
    .single();
  if (error) {
    return error.code === "23505" ? { fieldErrors: { ref: "Cette référence existe déjà." }, error: "Référence déjà utilisée.", values: echoValues(formData) } : { error: "Enregistrement impossible.", values: echoValues(formData) };
  }
  revalidatePath("/", "layout");
  redirect(`/instruments/${data.id}`);
}

export async function updateInstrument(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canWrite(s.role) || !idSchema.safeParse(id).success) return { error: "Droits insuffisants." };
  const parsed = parseForm(instrumentSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from("instruments").update(parsed.data).eq("id", id);
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
  redirect("/instruments");
}

export async function addIntervention(instrumentId: string, _: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { error: "Droits insuffisants." };
  const parsed = parseForm(interventionSchema, withInstrument(formData, instrumentId));
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from("interventions").insert({ ...parsed.data, tenant_id: s.tenant.id, realise_par: s.userId });
  if (error) return { error: "Enregistrement impossible.", values: echoValues(formData) };

  // Un étalonnage conforme replanifie automatiquement la prochaine échéance.
  if (parsed.data.type === "Étalonnage" && parsed.data.resultat !== "Non conforme") {
    const { data: inst } = await supabase.from("instruments").select("frequence_mois, date_etalonnage").eq("id", instrumentId).single();
    if (inst?.frequence_mois && (!inst.date_etalonnage || parsed.data.date >= inst.date_etalonnage)) {
      await supabase.from("instruments").update({ date_etalonnage: parsed.data.date, date_prochaine: addMonths(parsed.data.date, inst.frequence_mois) }).eq("id", instrumentId);
    }
  }
  revalidatePath("/", "layout");
  return { ok: "Intervention enregistrée." };
}

function withInstrument(formData: FormData, instrumentId: string): FormData {
  const copy = new FormData();
  for (const [k, v] of formData.entries()) copy.append(k, v);
  copy.set("instrument_id", instrumentId);
  return copy;
}
