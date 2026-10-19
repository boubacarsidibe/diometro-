import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag, rowClass } from "@/components/UrgencyTag";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";
import type { Instrument } from "@/lib/types";

export default async function InstrumentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireSession();
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).order("ref");
  const term = q.trim().toLowerCase().slice(0, 100);
  const rows = ((data ?? []) as Instrument[]).filter(
    (i) => !term || [i.ref, i.designation, i.type_mesure, i.batiment, i.zone].some((f) => f.toLowerCase().includes(term)),
  );
  return (
    <>
      <Topbar
        title="Instruments"
        subtitle={`${rows.length} instrument${rows.length > 1 ? "s" : ""}`}
        actions={canWrite(s.role) && <Link className="btn small primary" href="/instruments/new">Ajouter un instrument</Link>}
      />
      <div className="content">
        <form className="toolbar" role="search">
          <input className="input" name="q" defaultValue={q} placeholder="Rechercher (référence, désignation, zone…)" aria-label="Rechercher" maxLength={100} />
          <button className="btn small soft">Rechercher</button>
        </form>
        {rows.length === 0 ? (
          <div className="card empty">Aucun instrument.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Désignation</th><th>Localisation</th><th>Statut</th><th>Échéance</th><th>État</th></tr></thead>
              <tbody>
                {rows.map((i) => {
                  const u = urgencyOf(i.date_prochaine);
                  return (
                    <tr key={i.id} className={rowClass(u)}>
                      <td><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td>
                      <td>{i.designation}</td>
                      <td>{[i.batiment, i.zone].filter(Boolean).join(" · ") || "—"}</td>
                      <td>{i.statut}</td>
                      <td>{i.date_prochaine ?? "—"}</td>
                      <td><UrgencyTag urgency={u} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
