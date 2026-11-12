"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { ImportResult } from "@/app/(app)/instruments/import/actions";

type Action = (s: ImportResult | null, f: FormData) => Promise<ImportResult>;

// Import en deux temps : contrôle du fichier (rien n'est enregistré), puis confirmation de l'import des lignes valides.
export function ImportWizard({ check, run }: { check: Action; run: Action }) {
  const [report, checkAction] = useActionState(check, null);
  const [result, runAction] = useActionState(run, null);
  const [fileName, setFileName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const shown = result ?? report;
  const errors = shown?.rows.filter((r) => r.errors.length > 0) ?? [];

  function downloadReport() {
    if (!shown) return;
    const lines = [["Ligne", "Référence", "Désignation", "Résultat"].join(";")];
    for (const r of shown.rows) {
      const fail = result?.failed?.find((f) => f.line === r.line);
      const status = r.errors.length ? r.errors.join(" | ") : fail ? `Non importé : ${fail.error}` : result ? "Importé" : "Valide";
      lines.push([r.line, r.ref, r.designation, status].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }
    const url = URL.createObjectURL(new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "rapport-import.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (result?.inserted !== undefined) {
    return (
      <div className="card">
        <h2>Import terminé</h2>
        <div className={`notice ${result.inserted > 0 ? "ok" : "err"}`} role="status">
          <strong>{result.inserted} instrument{result.inserted > 1 ? "s" : ""} importé{result.inserted > 1 ? "s" : ""}</strong> sur {result.total} ligne{result.total > 1 ? "s" : ""}.
          {errors.length + (result.failed?.length ?? 0) > 0 && <> {errors.length + (result.failed?.length ?? 0)} ligne(s) non importée(s) : voir le rapport.</>}
        </div>
        {(result.failed?.length ?? 0) > 0 && (
          <ul className="helper" style={{ margin: "0 0 12px 18px" }}>{result.failed!.slice(0, 50).map((f) => <li key={f.line}>Ligne {f.line} ({f.ref}) : {f.error}</li>)}</ul>
        )}
        <div className="form-actions">
          <Link className="btn primary" href="/instruments">Voir le parc</Link>
          <button type="button" className="btn soft" onClick={downloadReport}>Télécharger le rapport</button>
          <Link className="btn soft" href="/instruments/import">Importer un autre fichier</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <form action={checkAction} className="card">
        <h2>2. Charger le fichier rempli</h2>
        <p className="helper" style={{ marginBottom: 10 }}>Rien n&apos;est enregistré à cette étape : DIOMETRO contrôle chaque ligne et vous montre le résultat.</p>
        <div className="form-actions" style={{ marginTop: 0, alignItems: "center" }}>
          <input ref={input} id="file" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="input" style={{ maxWidth: 360 }}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} aria-label="Fichier Excel à importer" />
          <SubmitButton className="btn primary">Contrôler le fichier</SubmitButton>
        </div>
      </form>

      {report && (
        <div className="card">
          <h2>3. Résultat du contrôle{fileName ? ` — ${fileName}` : ""}</h2>
          {report.fatal ? <div className="notice err" role="alert">{report.fatal}</div> : (
            <>
              <div className={`notice ${errors.length ? "err" : "ok"}`} role="status">
                <strong>{report.valid} ligne{report.valid > 1 ? "s" : ""} prête{report.valid > 1 ? "s" : ""} à importer</strong> sur {report.total}.
                {errors.length > 0 && <> {errors.length} ligne{errors.length > 1 ? "s" : ""} en erreur seront ignorée{errors.length > 1 ? "s" : ""} : corrigez-les dans le fichier et recommencez, ou importez seulement les lignes valides.</>}
              </div>
              {report.capacity && <div className="notice err" role="alert">{report.capacity}</div>}
              {errors.length > 0 && (
                <div className="table-wrap" style={{ marginBottom: 14 }}><table>
                  <thead><tr><th>Ligne</th><th>Référence</th><th>Erreurs</th></tr></thead>
                  <tbody>{errors.slice(0, 200).map((r) => (
                    <tr key={r.line} className="row-red"><td>{r.line}</td><td>{r.ref || "—"}</td><td><ul style={{ margin: 0, paddingLeft: 16 }}>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></td></tr>
                  ))}</tbody>
                </table></div>
              )}
              {report.valid > 0 && <form action={(fd) => { const f = input.current?.files?.[0]; if (f) fd.set("file", f); runAction(fd); }} className="form-actions">
                <SubmitButton className="btn primary">{`Importer ${report.valid} instrument${report.valid > 1 ? "s" : ""}`}</SubmitButton>
                <button type="button" className="btn soft" onClick={downloadReport}>Télécharger le rapport</button>
              </form>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
