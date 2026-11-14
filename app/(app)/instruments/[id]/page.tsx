import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { InstrumentForm } from "@/components/InstrumentForm";
import { CalculDetail } from "@/components/CalculDetail";
import { PublicLinkCard } from "@/components/PublicLinkCard";
import { appOrigin } from "@/lib/origin";
import { qrDataUri } from "@/lib/qr";
import { AttachmentList } from "@/components/AttachmentList";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { InterventionForm } from "@/components/InterventionForm";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag } from "@/components/UrgencyTag";
import { canEdit, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { conformityWarning, staleDeadlineWarning, urgencyOf } from "@/lib/status";
import { ConfirmAction } from "@/components/ConfirmAction";
import { CancelIntervention } from "@/components/CancelIntervention";
import { Filterable } from "@/components/Filterable";
import { suggestPrestataires } from "@/lib/suggest";
import { INTERVENTION_TYPES, RESULTATS } from "@/lib/schemas";
import type { Attachment, Instrument, Intervention, Prestataire } from "@/lib/types";
import { addIntervention, archiveInstrument, cancelIntervention, updateInstrument } from "../actions";
import { fmtDate } from "@/lib/dates";

export default async function InstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) notFound();
  const instrument = data as Instrument;
  const { data: ints } = await supabase.from("interventions").select("*").eq("instrument_id", id).order("date", { ascending: false });
  // annulee_at / annulation_motif existent après la migration 0012 (lus s'ils sont présents).
  const interventions = (ints ?? []) as (Intervention & { annulee_at?: string | null; annulation_motif?: string })[];
  const { data: calcRows } = await supabase.from("interventions").select("id, calcul").eq("instrument_id", id).not("calcul", "is", null);
  const calculs = new Map((calcRows ?? []).map((c) => [c.id as string, c.calcul as unknown]));
  const { data: atts } = await supabase.from("attachments").select("id, kind, filename, mime, size_bytes, created_at").eq("instrument_id", id).order("created_at", { ascending: false });
  const { data: prestRows } = await supabase.from("prestataires").select("*").is("deleted_at", null).eq("actif", true).order("nom");
  const prestFull = (prestRows ?? []) as Prestataire[];
  const prest = prestFull.map((p) => ({ id: p.id, nom: p.nom }));
  const suggestions = instrument.statut === "Réformé" ? [] : suggestPrestataires(instrument, prestFull, s.tenant.accreditation_label);
  const write = canEdit(s);
  const publicUrl = instrument.public_token ? `${await appOrigin()}/p/${instrument.public_token}` : null;
  const publicQr = publicUrl ? await qrDataUri(publicUrl) : null;

  return (
    <>
      <Topbar title={`${instrument.ref} — ${instrument.designation}`} subtitle="Fiche de vie de l'instrument" actions={<>{write && <Link className="btn small primary" href={`/instruments/${id}/etalonnage`}>Étalonner</Link>}<a className="btn small soft" href={`/export/fiche/${id}`}>Fiche de vie PDF</a><UrgencyTag urgency={urgencyOf(instrument.date_prochaine)} /></>} />
      <div className="content stack">
        {conformityWarning(instrument.conformite, instrument.date_prochaine) && <div className="notice err" role="note">{conformityWarning(instrument.conformite, instrument.date_prochaine)}</div>}
        {staleDeadlineWarning(instrument.date_prochaine, instrument.date_etalonnage) && <div className="notice err" role="note">{staleDeadlineWarning(instrument.date_prochaine, instrument.date_etalonnage)}</div>}
        <div className="card">
          <h2>Informations</h2>
          {write ? (
            <InstrumentForm action={updateInstrument.bind(null, id)} instrument={instrument} submit="Enregistrer" buildings={s.tenant.buildings} prestataires={prest ?? []} />
          ) : (
            <dl className="details">
              <dt>Statut</dt><dd>{instrument.statut}</dd>
              <dt>Type de mesure</dt><dd>{instrument.type_mesure || "—"}</dd>
              <dt>Localisation</dt><dd>{[instrument.batiment, instrument.zone].filter(Boolean).join(" · ") || "—"}</dd>
              <dt>Dernier étalonnage</dt><dd>{fmtDate(instrument.date_etalonnage)}</dd>
              <dt>Prochaine échéance</dt><dd>{fmtDate(instrument.date_prochaine)}</dd>
              <dt>Conformité</dt><dd>{instrument.conformite}</dd>
              <dt>Type d'étalonnage</dt><dd>{instrument.etalonnage_type}</dd>
              <dt>Tolérance / EMT</dt><dd>{instrument.tolerance || "—"}</dd>
              <dt>Propriétaire</dt><dd>{instrument.proprietaire || "—"}</dd>
              <dt>Commentaires</dt><dd>{instrument.commentaires || "—"}</dd>
            </dl>
          )}
        </div>

        <div className="card">
          <h2>Historique des interventions</h2>
          {interventions.length === 0 ? (
            <div className="empty">Aucune intervention enregistrée.</div>
          ) : (
            <Filterable placeholder="Rechercher (prestataire, certificat, observation…)" unit={["intervention", "interventions"]}
              selects={[
                { key: "type", label: "Tous les types", options: INTERVENTION_TYPES.map((t) => ({ value: t, label: t })) },
                { key: "resultat", label: "Tous les résultats", options: [...RESULTATS.map((t) => ({ value: t, label: t })), { value: "Annulée", label: "Annulées" }] },
              ]}>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Mode</th><th>Résultat</th><th>Prestataire</th><th>Certificat</th><th>Observation</th>{write && <th />}</tr></thead>
                  <tbody>
                    {interventions.map((i) => {
                      const cancelled = Boolean(i.annulee_at);
                      return (
                        <tr key={i.id} className={cancelled ? "cancelled" : undefined} data-f-type={i.type} data-f-resultat={cancelled ? "Annulée" : i.resultat}>
                          <td>{fmtDate(i.date)}</td><td>{i.type}</td><td>{i.mode ?? "—"}</td>
                          <td>{cancelled ? <span className="tag keep">Annulée</span> : <span className={`tag ${i.resultat === "Conforme" ? "green" : i.resultat === "Non conforme" ? "red" : "yellow"}`}>{i.resultat}</span>}</td>
                          <td>{i.prestataire || "—"}</td><td>{i.ref_certificat || "—"}</td>
                          <td>{i.observation || "—"}{i.calcul_type && <CalculDetail kind={i.calcul_type} data={(calculs.get(i.id) ?? null)} />}
                            {cancelled && <div className="helper keep">Annulée le {fmtDate(i.annulee_at!.slice(0, 10))} : {i.annulation_motif}</div>}</td>
                          {write && <td>{!cancelled && <CancelIntervention action={cancelIntervention.bind(null, id, i.id)} label={fmtDate(i.date)} />}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Filterable>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="card">
            <h2>Prestataires suggérés</h2>
            <p className="helper" style={{ marginBottom: 10 }}>Choisis parmi vos prestataires actifs selon le domaine de mesure de l&apos;instrument, l&apos;accréditation, votre note et le délai moyen.</p>
            <ul className="suggest-list">
              {suggestions.map((p) => (
                <li key={p.id}><Link href={`/prestataires/${p.id}`}><strong>{p.nom}</strong></Link> <span className="helper">{p.raisons.join(" · ")}</span>{p.contact && <div className="helper">{p.contact}</div>}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h2>Documents joints</h2>
          <AttachmentList items={(atts ?? []) as Attachment[]} instrumentId={id} canDelete={write} />
          {write && <div style={{ marginTop: 16 }}><AttachmentUploader instrumentId={id} /></div>}
        </div>

        {write && (
          <div className="card">
            <h2>QR code de l'instrument (fiche publique)</h2>
            <PublicLinkCard instrumentId={id} url={publicUrl} qr={publicQr} refName={instrument.ref} />
          </div>
        )}

        {write && (
          <div className="card">
            <h2>Ajouter une intervention</h2>
            <InterventionForm action={addIntervention.bind(null, id)} prestataires={prest ?? []} />
          </div>
        )}

        {s.role === "admin" && (
          <div><ConfirmAction action={archiveInstrument.bind(null, id)} label="Archiver cet instrument" confirmLabel="Oui, archiver"
            message={`Archiver ${instrument.ref} ? Il disparaît des listes et des alertes. Un administrateur peut le restaurer depuis la Corbeille.`} /></div>
        )}
      </div>
    </>
  );
}
