import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Topbar } from "@/components/Topbar";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type RawCheck = { instrument_id: string; found: boolean; instruments: { ref: string; designation: string } | { ref: string; designation: string }[] | null };

export default async function InventaireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireSession();
  const supabase = await createClient();
  const { data: run } = await supabase.from("inventory_runs").select("id, status, note, closed_at, created_at, total_count, found_count").eq("id", id).maybeSingle();
  if (!run) notFound();
  const { data } = await supabase.from("inventory_checks").select("instrument_id, found, instruments(ref, designation)").eq("run_id", id);
  const checks = ((data ?? []) as unknown as RawCheck[]).map((c) => { const i = Array.isArray(c.instruments) ? c.instruments[0] : c.instruments; return { id: c.instrument_id, found: c.found, ref: i?.ref ?? "?", designation: i?.designation ?? "" }; });
  const missing = checks.filter((c) => !c.found).sort((a, b) => a.ref.localeCompare(b.ref));
  return (
    <>
      <Topbar title={`Inventaire du ${new Date(run.closed_at ?? run.created_at).toLocaleDateString("fr-FR")}`} subtitle={`${run.found_count ?? checks.filter((c) => c.found).length} / ${run.total_count ?? checks.length} retrouvés${run.note ? ` — ${run.note}` : ""}`} />
      <div className="content">
        <div className="card">
          <h2>Instruments non retrouvés</h2>
          {missing.length === 0 ? <div className="empty">Tous les instruments ont été retrouvés.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Référence</th><th>Désignation</th></tr></thead>
              <tbody>{missing.map((m) => <tr key={m.id}><td><Link href={`/instruments/${m.id}`}>{m.ref}</Link></td><td>{m.designation}</td></tr>)}</tbody>
            </table></div>
          )}
        </div>
        <div style={{ marginTop: 16 }}><Link className="btn small soft" href="/inventaire">← Retour</Link></div>
      </div>
    </>
  );
}
