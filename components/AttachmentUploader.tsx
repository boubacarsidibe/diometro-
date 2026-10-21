"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_KINDS, ATTACHMENT_MIMES, MAX_ATTACHMENT_BYTES } from "@/lib/schemas";
import { registerAttachment, requestUpload } from "@/app/(app)/instruments/attachments";

const KIND_LABEL: Record<string, string> = { certificat: "Certificat d'étalonnage", fiche_de_vie: "Fiche de vie", procedure: "Procédure", photo: "Photo", autre: "Autre" };

export function AttachmentUploader({ instrumentId }: { instrumentId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("certificat");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const file = input.current?.files?.[0];
    if (!file) return setError("Choisissez un fichier.");
    if (file.size > MAX_ATTACHMENT_BYTES) return setError("Fichier trop volumineux (10 Mo maximum).");
    if (!(ATTACHMENT_MIMES as readonly string[]).includes(file.type)) return setError("Type non accepté : PDF, PNG, JPEG, WebP, Excel ou Word.");
    setBusy(true);
    try {
      const req = await requestUpload({ instrument_id: instrumentId, filename: file.name, mime: file.type, size: file.size, kind });
      if (!req.ok) return setError(req.error);
      const { error: upErr } = await createClient().storage.from("attachments").uploadToSignedUrl(req.path, req.token, file, { contentType: file.type });
      if (upErr) return setError("Envoi impossible. Réessayez.");
      const reg = await registerAttachment({ instrument_id: instrumentId, object_id: req.objectId, filename: file.name, kind });
      if (!reg.ok) return setError(reg.error);
      if (input.current) input.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      {error && <div className="notice err" role="alert">{error}</div>}
      <div className="grid cols-3">
        <div className="field"><label htmlFor="kind">Type de document</label>
          <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
        <div className="field full" style={{ gridColumn: "span 2" }}><label htmlFor="file">Fichier (10 Mo max)</label>
          <input id="file" ref={input} type="file" className="input" accept={ATTACHMENT_MIMES.join(",")} /></div>
      </div>
      <div className="form-actions"><button className="btn primary" disabled={busy}>{busy ? "Envoi…" : "Joindre le fichier"}</button></div>
    </form>
  );
}
