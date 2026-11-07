"use client";
import { useRef, useState } from "react";
import { ATTACHMENT_MIMES } from "@/lib/schemas";
import { prepareFile, type AttachmentKind } from "@/lib/upload-client";

export type PendingFile = { id: string; file: File; kind: AttachmentKind; originalSize: number };

const KIND_LABEL: Record<AttachmentKind, string> = { certificat: "Certificat d'étalonnage", fiche_de_vie: "Fiche de vie", procedure: "Procédure", photo: "Photo", autre: "Autre" };
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

// Sélection de fichiers et de photos AVANT la création de l'instrument : ils sont envoyés juste après l'enregistrement.
export function FilePicker({ value, onChange }: { value: PendingFile[]; onChange: (v: PendingFile[]) => void }) {
  const docs = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AttachmentKind>("certificat");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function add(files: FileList | null, forcedKind?: AttachmentKind) {
    if (!files?.length) return;
    setError(undefined);
    setBusy(true);
    const added: PendingFile[] = [];
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      const r = await prepareFile(f);
      if (r.ok) added.push({ id: crypto.randomUUID(), file: r.file, kind: forcedKind ?? (r.file.type.startsWith("image/") ? "photo" : kind), originalSize: f.size });
      else errors.push(r.error);
    }
    setBusy(false);
    if (errors.length) setError(errors.join(" "));
    if (added.length) onChange([...value, ...added]);
    if (docs.current) docs.current.value = "";
    if (camera.current) camera.current.value = "";
  }

  return (
    <div>
      {error && <div className="notice err" role="alert">{error}</div>}
      <div className="grid cols-3" style={{ alignItems: "end" }}>
        <div className="field"><label htmlFor="pick-kind">Type du document</label>
          <select id="pick-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)}>
            {(["certificat", "fiche_de_vie", "procedure", "autre"] as const).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select></div>
        <button type="button" className="btn soft" disabled={busy} onClick={() => docs.current?.click()}>📎 Choisir des fichiers</button>
        <button type="button" className="btn soft" disabled={busy} onClick={() => camera.current?.click()}>📷 Prendre une photo</button>
      </div>
      <input ref={docs} type="file" multiple hidden accept={ATTACHMENT_MIMES.join(",")} onChange={(e) => add(e.target.files)} />
      <input ref={camera} type="file" hidden accept="image/*" capture="environment" onChange={(e) => add(e.target.files, "photo")} />
      <p className="helper" style={{ marginTop: 8 }}>PDF, images, Word, Excel — 10 Mo maximum par fichier. Les photos sont réduites automatiquement avant l&apos;envoi.</p>
      {busy && <p className="helper" role="status">Préparation des fichiers…</p>}
      {value.length > 0 && (
        <ul style={{ listStyle: "none", marginTop: 10 }}>
          {value.map((p) => (
            <li key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
              <span className="tag">{KIND_LABEL[p.kind]}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.file.name}</span>
              <span className="helper">{size(p.file.size)}{p.originalSize > p.file.size * 1.2 ? ` (au lieu de ${size(p.originalSize)})` : ""}</span>
              <button type="button" className="btn small soft" onClick={() => onChange(value.filter((x) => x.id !== p.id))} aria-label={`Retirer ${p.file.name}`}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
