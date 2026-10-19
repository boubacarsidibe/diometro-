import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag, rowClass } from "@/components/UrgencyTag";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, urgencyOf } from "@/lib/status";
import type { Instrument } from "@/lib/types";

export default async function AlertsPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).eq("statut", "En service").order("date_prochaine", { ascending: true });
  const rows = ((data ?? []) as Instrument[]).filter((i) => ["expire", "urgent", "bientot"].includes(urgencyOf(i.date_prochaine)));
  return (
    <>
      <Topbar title="Alertes" subtitle="Instruments en service à étalonner ou en retard." />
      <div className="content">
        {rows.length === 0 ? (
          <div className="card empty">Aucune alerte : tous les instruments sont à jour.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Désignation</th><th>Échéance</th><th>Délai</th><th>État</th></tr></thead>
              <tbody>
                {rows.map((i) => {
                  const u = urgencyOf(i.date_prochaine);
                  const d = daysUntil(i.date_prochaine)!;
                  return (
                    <tr key={i.id} className={rowClass(u)}>
                      <td><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td>
                      <td>{i.designation}</td><td>{i.date_prochaine}</td>
                      <td>{d < 0 ? `${-d} j de retard` : `dans ${d} j`}</td>
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
