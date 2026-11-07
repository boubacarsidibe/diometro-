import { registerAttachment, requestUpload } from "@/app/(app)/instruments/attachments";
import { compressImage } from "@/lib/image-client";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_MIMES, MAX_ATTACHMENT_BYTES } from "@/lib/schemas";

export type AttachmentKind = "certificat" | "fiche_de_vie" | "procedure" | "photo" | "autre";

// Prépare un fichier avant envoi : les images sont compressées, puis on vérifie type et taille.
export async function prepareFile(file: File): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  let f = file;
  if (file.type.startsWith("image/")) {
    try { f = await compressImage(file); } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Image illisible." }; }
  }
  if (!(ATTACHMENT_MIMES as readonly string[]).includes(f.type)) return { ok: false, error: `« ${file.name} » : type non accepté (PDF, images, Word, Excel).` };
  if (f.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: `« ${file.name} » dépasse 10 Mo${file.type.startsWith("image/") ? " même après compression" : ""}.` };
  return { ok: true, file: f };
}

// Envoi d'un fichier déjà préparé : autorisation serveur → envoi direct au stockage → enregistrement.
export async function uploadAttachment(instrumentId: string, file: File, kind: AttachmentKind): Promise<string | null> {
  const req = await requestUpload({ instrument_id: instrumentId, filename: file.name, mime: file.type, size: file.size, kind });
  if (!req.ok) return req.error;
  const { error } = await createClient().storage.from("attachments").uploadToSignedUrl(req.path, req.token, file, { contentType: file.type });
  if (error) return "Envoi impossible. Réessayez.";
  const reg = await registerAttachment({ instrument_id: instrumentId, object_id: req.objectId, filename: file.name, kind });
  return reg.ok ? null : reg.error;
}
