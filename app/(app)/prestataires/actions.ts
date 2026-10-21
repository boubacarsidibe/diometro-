"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { prestataireSchema } from "@/lib/schemas";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

function dupMessage(code: string | undefined, formData: FormData): FormState | null {
  return code === "23505" ? { error: "Un prestataire porte déjà ce nom.", fieldErrors: { nom: "Nom déjà utilisé." }, values: echoValues(formData) } : null;
}

export async function createPrestataire(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { error: "Droits insuffisants." };
  const parsed = parseForm(prestataireSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { data, error } = await supabase.from("prestataires").insert({ ...parsed.data, tenant_id: s.tenant.id }).select("id").single();
  if (error) return dupMessage(error.code, formData) ?? { error: "Enregistrement impossible.", values: echoValues(formData) };
  revalidatePath("/prestataires");
  redirect(`/prestataires/${data.id}`);
}

export async function updatePrestataire(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canWrite(s.role) || !idSchema.safeParse(id).success) return { error: "Droits insuffisants." };
  const parsed = parseForm(prestataireSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.from("prestataires").update(parsed.data).eq("id", id);
  if (error) return dupMessage(error.code, formData) ?? { error: "Mise à jour impossible.", values: echoValues(formData) };
  revalidatePath("/prestataires");
  return { ok: "Prestataire mis à jour." };
}

export async function archivePrestataire(id: string) {
  const s = await requireSession();
  if (!canWrite(s.role) || !idSchema.safeParse(id).success) redirect("/prestataires");
  const supabase = await createClient();
  await supabase.from("prestataires").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/prestataires");
  redirect("/prestataires");
}
