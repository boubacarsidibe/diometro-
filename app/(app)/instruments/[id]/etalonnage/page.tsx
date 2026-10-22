import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DirectCalc } from "@/components/calc/DirectCalc";
import { PipetteCalc } from "@/components/calc/PipetteCalc";
import { Pt100Calc } from "@/components/calc/Pt100Calc";
import { Topbar } from "@/components/Topbar";
import { CATALOG, catalogById } from "@/lib/calc/catalog";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function InstrumentEtalonnagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const { id } = await params;
  const { type } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const s = await requireSession();
  if (!canWrite(s.role)) redirect(`/instruments/${id}`);
  const supabase = await createClient();
  const { data: inst } = await supabase.from("instruments").select("id, ref, designation, catalog_id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!inst) notFound();
  const entry = catalogById(type ?? "") ?? (inst.catalog_id ? catalogById(inst.catalog_id) : undefined);
  const title = `Étalonnage — ${inst.ref}`;

  if (!entry) {
    return (
      <>
        <Topbar title={title} subtitle="Choisissez le type d'instrument à étalonner." />
        <div className="content">
          <div className="grid cols-3">
            {CATALOG.filter((c) => c.id !== "autre").map((c) => (
              <Link key={c.id} href={`/instruments/${id}/etalonnage?type=${c.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: 26 }}>{c.icone}</div><strong>{c.nom}</strong><div className="helper">{c.calculateur ? "Avec calculateur" : "Saisie manuelle"}</div>
              </Link>
            ))}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <Topbar title={title} subtitle={`${entry.icone} ${entry.nom} — ${inst.designation}`} actions={<Link className="btn small soft" href={`/instruments/${id}/etalonnage`}>Changer de type</Link>} />
      <div className="content stack">
        <div className="card">
          <h2>Procédure</h2>
          <p className="helper"><strong>Norme :</strong> {entry.norme}</p>
          {entry.conditions.length > 0 && (<><p style={{ marginTop: 10 }}><strong>Conditions et matériel</strong></p><ul style={{ margin: "6px 0 0 20px", fontSize: 14 }}>{entry.conditions.map((x, k) => <li key={k}>{x}</li>)}</ul></>)}
          {entry.demarche.length > 0 && (<><p style={{ marginTop: 10 }}><strong>Démarche</strong></p><ol style={{ margin: "6px 0 0 20px", fontSize: 14 }}>{entry.demarche.map((x, k) => <li key={k}>{x}</li>)}</ol></>)}
        </div>
        {entry.calculateur === "pipette" && <PipetteCalc instrumentId={id} />}
        {entry.calculateur === "pt100" && <Pt100Calc instrumentId={id} />}
        {entry.calculateur === "direct" && <DirectCalc instrumentId={id} />}
        {!entry.calculateur && <div className="card empty">Pas de calculateur pour ce type : enregistrez l&apos;intervention depuis la fiche de l&apos;instrument.</div>}
      </div>
    </>
  );
}
