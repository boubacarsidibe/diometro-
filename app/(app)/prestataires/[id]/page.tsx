import { notFound } from "next/navigation";
import { z } from "zod";
import { PrestataireForm } from "@/components/PrestataireForm";
import { Topbar } from "@/components/Topbar";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Prestataire } from "@/lib/types";
import { archivePrestataire, updatePrestataire } from "../actions";

export default async function PrestatairePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("prestataires").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) notFound();
  const p = data as Prestataire;
  const { count } = await supabase.from("interventions").select("id", { count: "exact", head: true }).eq("prestataire_id", id);
  const write = canWrite(s.role);
  return (
    <>
      <Topbar title={p.nom} subtitle={`${p.type} · ${count ?? 0} intervention${(count ?? 0) > 1 ? "s" : ""}`} actions={p.cofrac ? <span className="tag green">COFRAC {p.ref_cofrac}</span> : undefined} />
      <div className="content stack">
        <div className="card">
          {write ? (
            <PrestataireForm action={updatePrestataire.bind(null, id)} prestataire={p} submit="Enregistrer" />
          ) : (
            <dl className="details">
              <dt>Domaines</dt><dd>{p.domaines.join(", ") || "—"}</dd>
              <dt>Contact</dt><dd>{[p.contact_nom, p.contact_fonction].filter(Boolean).join(" — ") || "—"}</dd>
              <dt>Téléphone</dt><dd>{p.telephone || "—"}</dd>
              <dt>Email</dt><dd>{p.email || "—"}</dd>
              <dt>Adresse</dt><dd>{p.adresse || "—"}</dd>
              <dt>Délai moyen</dt><dd>{p.delai_moyen_jours != null ? `${p.delai_moyen_jours} jours` : "—"}</dd>
              <dt>Commentaires</dt><dd>{p.commentaires || "—"}</dd>
            </dl>
          )}
        </div>
        {write && <form action={archivePrestataire.bind(null, id)}><button className="btn danger small">Archiver ce prestataire</button></form>}
      </div>
    </>
  );
}
