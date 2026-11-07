"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePicker, type PendingFile } from "@/components/FilePicker";
import { InstrumentForm } from "@/components/InstrumentForm";
import type { FormState } from "@/lib/form";
import { uploadAttachment } from "@/lib/upload-client";

export function NewInstrument({
  action, buildings, prestataires,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; buildings: string[]; prestataires: { id: string; nom: string }[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [failed, setFailed] = useState<{ id: string; errors: string[] } | null>(null);

  async function afterCreate(id: string) {
    const errors: string[] = [];
    for (const p of files) {
      const err = await uploadAttachment(id, p.file, p.kind);
      if (err) errors.push(`${p.file.name} : ${err}`);
    }
    if (errors.length === 0) { router.push(`/instruments/${id}`); return; }
    setFailed({ id, errors }); // l'instrument existe : on propose de rejoindre la fiche pour renvoyer les fichiers manquants
  }

  return (
    <>
      {failed && (
        <div className="notice err" role="alert">
          L&apos;instrument est créé, mais {failed.errors.length} fichier(s) n&apos;ont pas pu être envoyés :
          <ul style={{ margin: "6px 0 6px 18px" }}>{failed.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          <Link className="btn small primary" href={`/instruments/${failed.id}`}>Ouvrir la fiche pour les renvoyer</Link>
        </div>
      )}
      <InstrumentForm action={action} submit="Créer l'instrument" buildings={buildings} prestataires={prestataires}
        extra={<FilePicker value={files} onChange={setFiles} />} afterCreate={afterCreate} />
    </>
  );
}
