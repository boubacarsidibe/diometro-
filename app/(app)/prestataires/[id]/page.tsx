import { notFound } from "next/navigation";
import { z } from "zod";
import { PrestataireForm } from "@/components/PrestataireForm";
import { Topbar } from "@/components/Topbar";
import { canEdit, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Prestataire } from "@/lib/types";
import { money } from "@/lib/money";
import { archivePrestataire, updatePrestataire } from "../actions";
import { ConfirmAction } from "@/components/ConfirmAction";

export default async function PrestatairePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("prestataires").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) notFound();
  const p = data as Prestataire;
  const { count } = await supabase.from("interventions").select("id", { count: "exact", head: true }).eq("prestataire_id", id);
  const write = canEdit(s);
  return (
    <>
      <Topbar title={p.nom} subtitle={`${p.type} · ${count ?? 0} intervention${(count ?? 0) > 1 ? "s" : ""}`} actions={p.cofrac ? <span className="tag green">{s.tenant.accreditation_label} {p.ref_cofrac}</span> : undefined} />
      <div className="content stack">
        <div className="card">
          {write ? (
            <PrestataireForm action={updatePrestataire.bind(null, id)} prestataire={p} submit="Enregistrer" accreditation={s.tenant.accreditation_label} defaultCurrency={s.tenant.currency} />
          ) : (
            <dl className="details">
              <dt>Domaines</dt><dd>{p.domaines.join(", ") || "—"}</dd>
              <dt>Contact</dt><dd>{[p.contact_nom, p.contact_fonction].filter(Boolean).join(" — ") || "—"}</dd>
              <dt>Téléphone</dt><dd>{p.telephone || "—"}</dd>
              <dt>Email</dt><dd>{p.email || "—"}</dd>
              <dt>Adresse</dt><dd>{p.adresse || "—"}</dd>
              <dt>Tarif horaire</dt><dd>{p.tarif_horaire != null ? money(p.tarif_horaire, p.devise) : "—"}</dd>
              <dt>Délai moyen</dt><dd>{p.delai_moyen_jours != null ? `${p.delai_moyen_jours} jours` : "—"}</dd>
              <dt>Commentaires</dt><dd>{p.commentaires || "—"}</dd>
            </dl>
          )}
        </div>
        {write && <div><ConfirmAction action={archivePrestataire.bind(null, id)} label="Archiver ce prestataire" confirmLabel="Oui, archiver" message={`Archiver ${p.nom} ? Il n'apparaît plus dans les listes. Un administrateur peut le restaurer depuis la Corbeille.`} /></div>}
      </div>
    </>
  );
}
