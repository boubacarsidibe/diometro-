"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseForm, type FormState } from "@/lib/form";
import { inventoryNoteSchema } from "@/lib/schemas";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

export async function startInventory(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { error: "Droits insuffisants." };
  const parsed = parseForm(inventoryNoteSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_inventory", { p_note: parsed.data.note });
  if (error) return { error: error.message.includes("inventory_one_open") ? "Un inventaire est déjà en cours." : "Impossible de démarrer l'inventaire." };
  revalidatePath("/inventaire");
  return { ok: "Inventaire démarré." };
}

export async function setFound(runId: string, instrumentId: string, found: boolean): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (!canWrite(s.role) || !uuid.safeParse(runId).success || !uuid.safeParse(instrumentId).success) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_checks").update({ found }).eq("run_id", runId).eq("instrument_id", instrumentId).select("instrument_id");
  return { ok: !error && (data?.length ?? 0) === 1 };
}

export async function closeInventory(runId: string) {
  const s = await requireSession();
  if (!canWrite(s.role) || !uuid.safeParse(runId).success) redirect("/inventaire");
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_inventory", { p_run: runId });
  revalidatePath("/inventaire");
  redirect(error ? "/inventaire" : `/inventaire/${runId}`);
}
