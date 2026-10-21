import { notFound } from "next/navigation";
import { z } from "zod";
import { InstrumentForm } from "@/components/InstrumentForm";
import { AttachmentList } from "@/components/AttachmentList";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import { InterventionForm } from "@/components/InterventionForm";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag } from "@/components/UrgencyTag";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";
import type { Attachment, Instrument, Intervention } from "@/lib/types";
import { addIntervention, archiveInstrument, updateInstrument } from "../actions";

export default async function InstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) notFound();
  const instrument = data as Instrument;
  const { data: ints } = await supabase.from("interventions").select("*").eq("instrument_id", id).order("date", { ascending: false });
  const interventions = (ints ?? []) as Intervention[];
  const { data: atts } = await supabase.from("attachments").select("id, kind, filename, mime, size_bytes, created_at").eq("instrument_id", id).order("created_at", { ascending: false });
  const { data: prest } = await supabase.from("prestataires").select("id, nom").is("deleted_at", null).eq("actif", true).order("nom");
  const write = canWrite(s.role);

  return (
    <>
      <Topbar title={`${instrument.ref} — ${instrument.designation}`} subtitle="Fiche de vie de l'instrument" actions={<><a className="btn small soft" href={`/export/fiche/${id}`}>Fiche de vie PDF</a><UrgencyTag urgency={urgencyOf(instrument.date_prochaine)} /></>} />
      <div className="content stack">
        <div className="card">
          <h2>Informations</h2>
          {write ? (
            <InstrumentForm action={updateInstrument.bind(null, id)} instrument={instrument} submit="Enregistrer" />
          ) : (
            <dl className="details">
              <dt>Statut</dt><dd>{instrument.statut}</dd>
              <dt>Type de mesure</dt><dd>{instrument.type_mesure || "—"}</dd>
              <dt>Localisation</dt><dd>{[instrument.batiment, instrument.zone].filter(Boolean).join(" · ") || "—"}</dd>
              <dt>Dernier étalonnage</dt><dd>{instrument.date_etalonnage ?? "—"}</dd>
              <dt>Prochaine échéance</dt><dd>{instrument.date_prochaine ?? "—"}</dd>
              <dt>Commentaires</dt><dd>{instrument.commentaires || "—"}</dd>
            </dl>
          )}
        </div>

        <div className="card">
          <h2>Historique des interventions</h2>
          {interventions.length === 0 ? (
            <div className="empty">Aucune intervention enregistrée.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Résultat</th><th>Prestataire</th><th>Certificat</th><th>Observation</th></tr></thead>
                <tbody>
                  {interventions.map((i) => (
                    <tr key={i.id}>
                      <td>{i.date}</td><td>{i.type}</td>
                      <td><span className={`tag ${i.resultat === "Conforme" ? "green" : i.resultat === "Non conforme" ? "red" : "yellow"}`}>{i.resultat}</span></td>
                      <td>{i.prestataire || "—"}</td><td>{i.ref_certificat || "—"}</td><td>{i.observation || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Documents joints</h2>
          <AttachmentList items={(atts ?? []) as Attachment[]} instrumentId={id} canDelete={write} />
          {write && <div style={{ marginTop: 16 }}><AttachmentUploader instrumentId={id} /></div>}
        </div>

        {write && (
          <div className="card">
            <h2>Ajouter une intervention</h2>
            <InterventionForm action={addIntervention.bind(null, id)} prestataires={prest ?? []} />
          </div>
        )}

        {s.role === "admin" && (
          <form action={archiveInstrument.bind(null, id)}>
            <button className="btn danger small">Archiver cet instrument</button>
          </form>
        )}
      </div>
    </>
  );
}
