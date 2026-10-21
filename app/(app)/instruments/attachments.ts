"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { registerAttachmentSchema, uploadRequestSchema } from "@/lib/schemas";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

// Étape 1 : autorisation. Le fichier part ensuite directement du navigateur vers le stockage (lien signé à usage unique).
export async function requestUpload(input: unknown): Promise<Result<{ path: string; token: string; objectId: string }>> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { ok: false, error: "Droits insuffisants." };
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Fichier refusé : type non autorisé ou taille supérieure à 10 Mo." };
  const supabase = await createClient();
  const { data: inst } = await supabase.from("instruments").select("id").eq("id", parsed.data.instrument_id).is("deleted_at", null).maybeSingle();
  if (!inst) return { ok: false, error: "Instrument introuvable." };
  const objectId = crypto.randomUUID();
  const path = `${s.tenant.id}/${inst.id}/${objectId}`;
  const { data, error } = await supabase.storage.from("attachments").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "Envoi impossible pour le moment." };
  return { ok: true, path: data.path, token: data.token, objectId };
}

// Étape 2 : on relit la taille et le type RÉELS dans le stockage (jamais ceux annoncés par le navigateur).
export async function registerAttachment(input: unknown): Promise<Result<object>> {
  const s = await requireSession();
  if (!canWrite(s.role)) return { ok: false, error: "Droits insuffisants." };
  const parsed = registerAttachmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const { instrument_id, object_id, filename, kind } = parsed.data;
  const supabase = await createClient();
  const folder = `${s.tenant.id}/${instrument_id}`;
  const { data: list } = await supabase.storage.from("attachments").list(folder, { search: object_id, limit: 5 });
  const obj = list?.find((o) => o.name === object_id);
  const size = Number((obj?.metadata as { size?: number } | null)?.size);
  const mime = String((obj?.metadata as { mimetype?: string } | null)?.mimetype ?? "");
  if (!obj || !size) return { ok: false, error: "Fichier introuvable dans le stockage." };
  const { error } = await supabase.from("attachments").insert({
    tenant_id: s.tenant.id, instrument_id, kind, filename: filename.slice(0, 200), mime, size_bytes: size,
    storage_path: `${folder}/${object_id}`, uploaded_by: s.userId,
  });
  if (error) {
    await supabase.storage.from("attachments").remove([`${folder}/${object_id}`]); // pas d'orphelin
    return { ok: false, error: "Type de fichier non accepté." };
  }
  revalidatePath(`/instruments/${instrument_id}`);
  return { ok: true };
}

export async function deleteAttachment(id: string, instrumentId: string) {
  const s = await requireSession();
  if (!canWrite(s.role) || !z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const { data: att } = await supabase.from("attachments").select("storage_path").eq("id", id).maybeSingle();
  if (!att) return;
  await supabase.storage.from("attachments").remove([att.storage_path]);
  await supabase.from("attachments").delete().eq("id", id);
  revalidatePath(`/instruments/${instrumentId}`);
}
