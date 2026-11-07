import Link from "next/link";
import { InventoryChecklist, type CheckRow } from "@/components/InventoryChecklist";
import { StartInventoryForm } from "@/components/StartInventoryForm";
import { Topbar } from "@/components/Topbar";
import { canEdit, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { closeInventory, startInventory } from "./actions";

type Run = { id: string; status: string; note: string; created_at: string; closed_at: string | null; total_count: number | null; found_count: number | null; created_by: string | null };
type RawCheck = { instrument_id: string; found: boolean; instruments: { ref: string; designation: string; batiment: string; zone: string } | { ref: string; designation: string; batiment: string; zone: string }[] | null };

export default async function InventairePage() {
  const s = await requireSession();
  const write = canEdit(s);
  const supabase = await createClient();
  const [{ data: runsData }, { data: members }] = await Promise.all([
    supabase.from("inventory_runs").select("id, status, note, created_at, closed_at, total_count, found_count, created_by").order("created_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("user_id, display_name"),
  ]);
  const runs = (runsData ?? []) as Run[];
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const open = runs.find((r) => r.status === "en_cours");
  let rows: CheckRow[] = [];
  if (open) {
    const { data } = await supabase.from("inventory_checks").select("instrument_id, found, instruments(ref, designation, batiment, zone)").eq("run_id", open.id);
    rows = ((data ?? []) as unknown as RawCheck[])
      .map((c) => { const i = Array.isArray(c.instruments) ? c.instruments[0] : c.instruments; return { instrument_id: c.instrument_id, found: c.found, ref: i?.ref ?? "?", designation: i?.designation ?? "", location: [i?.batiment, i?.zone].filter(Boolean).join(" · ") }; })
      .sort((a, b) => a.ref.localeCompare(b.ref));
  }
  const closed = runs.filter((r) => r.status === "cloture");
  return (
    <>
      <Topbar title="Inventaire" subtitle="Vérification physique de la présence des instruments."
        actions={open && write ? <form action={closeInventory.bind(null, open.id)}><button className="btn small primary">Clôturer l&apos;inventaire</button></form> : undefined} />
      <div className="content stack">
        {open ? (
          <>
            <div className="notice ok">Inventaire en cours depuis le {new Date(open.created_at).toLocaleDateString("fr-FR")}{open.note ? ` — ${open.note}` : ""}.</div>
            <InventoryChecklist runId={open.id} rows={rows} canEdit={write} />
          </>
        ) : write ? (
          <div className="card"><h2>Nouvel inventaire</h2><p className="helper" style={{ marginBottom: 12 }}>Tous les instruments non archivés et non réformés seront listés ; cochez ceux que vous retrouvez.</p><StartInventoryForm action={startInventory} /></div>
        ) : (
          <div className="card empty">Aucun inventaire en cours.</div>
        )}
        <div className="card">
          <h2>Historique</h2>
          {closed.length === 0 ? <div className="empty">Aucun inventaire clôturé.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Réalisé par</th><th>Retrouvés</th><th>Total</th><th>Taux</th><th /></tr></thead>
              <tbody>{closed.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.closed_at ?? r.created_at).toLocaleDateString("fr-FR")}</td><td>{(r.created_by && names.get(r.created_by)) || "—"}</td>
                  <td>{r.found_count}</td><td>{r.total_count}</td><td>{r.total_count ? Math.round(((r.found_count ?? 0) / r.total_count) * 100) : 0} %</td>
                  <td><Link href={`/inventaire/${r.id}`}>Détail</Link></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
