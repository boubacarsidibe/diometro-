"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ATTACHMENT_KINDS, ATTACHMENT_MIMES } from "@/lib/schemas";
import { prepareFile, uploadAttachment, type AttachmentKind } from "@/lib/upload-client";

const KIND_LABEL: Record<string, string> = { certificat: "Certificat d'étalonnage", fiche_de_vie: "Fiche de vie", procedure: "Procédure", photo: "Photo", autre: "Autre" };

export function AttachmentUploader({ instrumentId }: { instrumentId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AttachmentKind>("certificat");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function send(files: FileList | null, forced?: AttachmentKind) {
    setError(undefined);
    if (!files?.length) return setError("Choisissez un fichier.");
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const prep = await prepareFile(f);
        if (!prep.ok) { setError(prep.error); continue; }
        const err = await uploadAttachment(instrumentId, prep.file, forced ?? (prep.file.type.startsWith("image/") && kind === "autre" ? "photo" : kind));
        if (err) setError(err);
      }
      router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
      if (camera.current) camera.current.value = "";
    }
  }
  return (
    <div>
      {error && <div className="notice err" role="alert">{error}</div>}
      <div className="grid cols-3" style={{ alignItems: "end" }}>
        <div className="field"><label htmlFor="kind">Type de document</label>
          <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)}>{ATTACHMENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></div>
        <button type="button" className="btn soft" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Envoi…" : "📎 Joindre des fichiers"}</button>
        <button type="button" className="btn soft" disabled={busy} onClick={() => camera.current?.click()}>📷 Prendre une photo</button>
      </div>
      <input ref={input} type="file" multiple hidden accept={ATTACHMENT_MIMES.join(",")} onChange={(e) => send(e.target.files)} />
      <input ref={camera} type="file" hidden accept="image/*" capture="environment" onChange={(e) => send(e.target.files, "photo")} />
      <p className="helper" style={{ marginTop: 8 }}>10 Mo maximum par fichier ; les photos sont réduites automatiquement avant l&apos;envoi.</p>
    </div>
  );
}
