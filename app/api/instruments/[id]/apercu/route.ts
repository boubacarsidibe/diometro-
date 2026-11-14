import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Données de la fenêtre « Aperçu » de la liste des instruments : résumé, dernière intervention, documents joints.
// Lecture sous RLS (limitée à l'entreprise de l'utilisateur), accessible à tous les rôles, y compris consultation.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  await requireSession();
  const supabase = await createClient();

  const { data: ins } = await supabase.from("instruments")
    .select("id, ref, designation, type_mesure, batiment, zone, statut, conformite, date_etalonnage, date_prochaine, tolerance")
    .eq("id", id).is("deleted_at", null).maybeSingle();
  if (!ins) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const [{ data: atts }, { data: ints }] = await Promise.all([
    supabase.from("attachments").select("id, kind, filename, mime, size_bytes, created_at").eq("instrument_id", id).order("created_at", { ascending: false }),
    // select("*") : la colonne annulee_at n'existe qu'après la migration 0012.
    supabase.from("interventions").select("*").eq("instrument_id", id).order("date", { ascending: false }).limit(10),
  ]);
  const last = (ints ?? []).find((i) => !(i as { annulee_at?: string | null }).annulee_at) as
    | { date: string; type: string; resultat: string; prestataire: string; ref_certificat: string } | undefined;

  return NextResponse.json(
    {
      instrument: ins,
      derniere: last ? { date: last.date, type: last.type, resultat: last.resultat, prestataire: last.prestataire, ref_certificat: last.ref_certificat } : null,
      documents: atts ?? [],
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
