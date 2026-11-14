import { Topbar } from "@/components/Topbar";
import { Filterable } from "@/components/Filterable";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { restoreItem } from "./actions";
import { fmtDate } from "@/lib/dates";

export default async function CorbeillePage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: instruments }, { data: prestataires }] = await Promise.all([
    supabase.from("instruments").select("id, ref, designation, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    supabase.from("prestataires").select("id, nom, deleted_at").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
  ]);
  const fmt = (d: string | null) => fmtDate(d, "");
  return (
    <>
      <Topbar title="Corbeille" subtitle="Éléments archivés : restaurez-les en un clic. Aucune suppression définitive n'est possible depuis l'application." />
      <div className="content stack">
        <div className="card">
          <h2>Instruments archivés</h2>
          {(instruments ?? []).length === 0 ? <div className="empty">Aucun instrument archivé.</div> : (
            <Filterable placeholder="Rechercher un instrument archivé" unit={["instrument", "instruments"]}><div className="table-wrap"><table>
              <thead><tr><th>Référence</th><th>Désignation</th><th>Archivé le</th><th /></tr></thead>
              <tbody>{(instruments ?? []).map((i) => (
                <tr key={i.id}><td>{i.ref}</td><td>{i.designation}</td><td>{fmt(i.deleted_at)}</td>
                  <td><form action={restoreItem.bind(null, "instruments", i.id)}><button className="btn small soft">Restaurer</button></form></td></tr>
              ))}</tbody>
            </table></div></Filterable>
          )}
        </div>
        <div className="card">
          <h2>Prestataires archivés</h2>
          {(prestataires ?? []).length === 0 ? <div className="empty">Aucun prestataire archivé.</div> : (
            <Filterable placeholder="Rechercher un prestataire archivé" unit={["prestataire", "prestataires"]}><div className="table-wrap"><table>
              <thead><tr><th>Nom</th><th>Archivé le</th><th /></tr></thead>
              <tbody>{(prestataires ?? []).map((p) => (
                <tr key={p.id}><td>{p.nom}</td><td>{fmt(p.deleted_at)}</td>
                  <td><form action={restoreItem.bind(null, "prestataires", p.id)}><button className="btn small soft">Restaurer</button></form></td></tr>
              ))}</tbody>
            </table></div></Filterable>
          )}
        </div>
      </div>
    </>
  );
}
