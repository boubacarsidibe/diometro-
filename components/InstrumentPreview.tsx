"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmtDate } from "@/lib/dates";
import { instrumentUrgency } from "@/lib/status";
import { statutLabel } from "@/lib/schemas";
import { UrgencyTag } from "@/components/UrgencyTag";

type Doc = { id: string; kind: string; filename: string; mime: string; size_bytes: number; created_at: string };
type Data = {
  instrument: {
    id: string; ref: string; designation: string; type_mesure: string | null; batiment: string | null; zone: string | null;
    statut: string; conformite: string; date_etalonnage: string | null; date_prochaine: string | null; tolerance: string | null;
  };
  derniere: { date: string; type: string; resultat: string; prestataire: string; ref_certificat: string } | null;
  documents: Doc[];
};

const KIND_LABEL: Record<string, string> = { certificat: "Certificat", fiche_de_vie: "Fiche de vie", procedure: "Procédure", photo: "Photo", autre: "Autre" };
const IMAGE = new Set(["image/png", "image/jpeg", "image/webp"]);
const viewable = (d: Doc) => IMAGE.has(d.mime) || d.mime === "application/pdf";
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

/**
 * Bouton « Aperçu » de la liste des instruments : ouvre une fenêtre avec le résumé de l'instrument,
 * ses photos et ses documents (certificats PDF lisibles sur place), sans passer par la fiche de modification.
 * Les fichiers sont servis par /api/attachments/<id>/view (lecture sous RLS, jamais mis en cache).
 */
export function InstrumentPreview({ id, label, count }: { id: string; label: string; count: number }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/instruments/${id}/apercu`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      setError("Impossible de charger l'aperçu. Réessayez ou ouvrez la fiche.");
    }
  }, [id]);

  const open = () => {
    dlg.current?.showModal();
    if (!data) void load();
  };
  const close = () => { dlg.current?.close(); };

  // Remet la fenêtre sur la vue d'ensemble à chaque fermeture (Échap compris).
  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    const reset = () => setCurrent(null);
    el.addEventListener("close", reset);
    return () => el.removeEventListener("close", reset);
  }, []);

  const docs = data?.documents ?? [];
  const shown = docs.filter(viewable);
  const photos = docs.filter((d) => IMAGE.has(d.mime));
  const others = docs.filter((d) => !IMAGE.has(d.mime));
  const doc = current !== null ? shown[current] : null;

  return (
    <>
      <button type="button" className="btn small soft" onClick={open} aria-haspopup="dialog" aria-label={`Aperçu de ${label}${count ? `, ${count} document${count > 1 ? "s" : ""}` : ""}`}>
        Aperçu{count > 0 && <span className="pv-count" aria-hidden="true">{count}</span>}
      </button>
      <dialog ref={dlg} className="pv-dialog" aria-label={`Aperçu de ${label}`} onClick={(e) => { if (e.target === dlg.current) close(); }}>
        <div className="pv-box">
          <header className="pv-head">
            <div>
              <strong>{data ? data.instrument.ref : label}</strong>
              {data && <span className="helper"> {data.instrument.designation}</span>}
            </div>
            <button type="button" className="pv-close" onClick={close} aria-label="Fermer l'aperçu">×</button>
          </header>

          {doc ? (
            <div className="pv-viewer">
              <div className="pv-tools">
                <button type="button" className="btn small soft" onClick={() => setCurrent(null)}>← Retour</button>
                <span className="pv-name" title={doc.filename}>{KIND_LABEL[doc.kind] ?? doc.kind} · {doc.filename}</span>
                {shown.length > 1 && <>
                  <button type="button" className="btn small soft" onClick={() => setCurrent((current! - 1 + shown.length) % shown.length)} aria-label="Document précédent">‹</button>
                  <span className="helper">{current! + 1} / {shown.length}</span>
                  <button type="button" className="btn small soft" onClick={() => setCurrent((current! + 1) % shown.length)} aria-label="Document suivant">›</button>
                </>}
                <a className="btn small soft" href={`/api/attachments/${doc.id}/view`} target="_blank" rel="noopener noreferrer">Plein écran</a>
                <a className="btn small soft" href={`/api/attachments/${doc.id}`}>Télécharger</a>
              </div>
              {IMAGE.has(doc.mime)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className="pv-big" src={`/api/attachments/${doc.id}/view`} alt={doc.filename} />
                : <iframe className="pv-pdf" src={`/api/attachments/${doc.id}/view`} title={doc.filename} />}
            </div>
          ) : (
            <div className="pv-body">
              {error && <div className="notice err" role="alert">{error} <button type="button" className="btn small soft" onClick={() => void load()}>Réessayer</button></div>}
              {!data && !error && <div className="empty" role="status">Chargement…</div>}
              {data && <>
                <dl className="details pv-details">
                  <dt>Statut</dt><dd>{statutLabel(data.instrument.statut)}</dd>
                  <dt>Conformité</dt><dd>{data.instrument.conformite}</dd>
                  <dt>Échéance</dt><dd>{fmtDate(data.instrument.date_prochaine)} <UrgencyTag urgency={instrumentUrgency(data.instrument)} statut={data.instrument.statut} /></dd>
                  <dt>Dernier étalonnage</dt><dd>{fmtDate(data.instrument.date_etalonnage)}</dd>
                  <dt>Localisation</dt><dd>{[data.instrument.batiment, data.instrument.zone].filter(Boolean).join(" · ") || "—"}</dd>
                  {data.instrument.type_mesure && <><dt>Type de mesure</dt><dd>{data.instrument.type_mesure}</dd></>}
                  {data.instrument.tolerance && <><dt>Tolérance / EMT</dt><dd>{data.instrument.tolerance}</dd></>}
                  {data.derniere && <><dt>Dernière intervention</dt><dd>
                    {fmtDate(data.derniere.date)} · {data.derniere.type} · {data.derniere.resultat}
                    {data.derniere.prestataire && ` · ${data.derniere.prestataire}`}
                    {data.derniere.ref_certificat && <> · certificat {data.derniere.ref_certificat}</>}
                  </dd></>}
                </dl>

                <h3 className="pv-h">Photos</h3>
                {photos.length === 0 ? <p className="helper">Aucune photo.</p> : (
                  <div className="pv-thumbs">
                    {photos.map((p) => (
                      <button key={p.id} type="button" className="pv-thumb" onClick={() => setCurrent(shown.indexOf(p))} aria-label={`Agrandir ${p.filename}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/attachments/${p.id}/view`} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}

                <h3 className="pv-h">Certificats et documents</h3>
                {others.length === 0 ? <p className="helper">Aucun document.</p> : (
                  <ul className="pv-docs">
                    {others.map((d) => (
                      <li key={d.id}>
                        <span className="tag">{KIND_LABEL[d.kind] ?? d.kind}</span>
                        <span className="pv-name" title={d.filename}>{d.filename}</span>
                        <span className="helper">{size(d.size_bytes)} · {fmtDate(d.created_at)}</span>
                        {viewable(d)
                          ? <button type="button" className="btn small primary" onClick={() => setCurrent(shown.indexOf(d))}>Voir</button>
                          : <a className="btn small soft" href={`/api/attachments/${d.id}`}>Télécharger</a>}
                      </li>
                    ))}
                  </ul>
                )}
              </>}
            </div>
          )}

          <footer className="pv-foot">
            <Link className="btn small soft" href={`/instruments/${id}`}>Ouvrir la fiche</Link>
            <button type="button" className="btn small soft" onClick={close}>Fermer</button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
