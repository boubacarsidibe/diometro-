import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag, rowClass } from "@/components/UrgencyTag";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, urgencyOf } from "@/lib/status";
import type { Instrument } from "@/lib/types";

export default async function DashboardPage() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).order("date_prochaine", { ascending: true, nullsFirst: false });
  const all = (data ?? []) as Instrument[];
  const active = all.filter((i) => i.statut === "En service");
  const counts = { expire: 0, urgent: 0, bientot: 0, ok: 0, none: 0 };
  for (const i of active) counts[urgencyOf(i.date_prochaine)]++;
  const conformes = counts.ok;
  const pct = active.length ? Math.round((conformes / active.length) * 100) : 0;
  const upcoming = active.filter((i) => ["expire", "urgent", "bientot"].includes(urgencyOf(i.date_prochaine))).slice(0, 8);

  return (
    <>
      <Topbar
        title="Tableau de bord"
        subtitle="Vue d'ensemble du parc d'instruments."
        actions={canWrite(s.role) && <Link className="btn small primary" href="/instruments/new">Ajouter un instrument</Link>}
      />
      <div className="content">
        <section className="dash-hero">
          <div>
            <div className="dash-hero-label">Vue d&apos;ensemble</div>
            <div className="dash-hero-title">{all.length === 0 ? "Aucun instrument" : `${pct} % du parc à jour`}</div>
            <div className="dash-hero-sub">
              {active.length} instrument{active.length > 1 ? "s" : ""} en service · {counts.expire} expiré{counts.expire > 1 ? "s" : ""} · {counts.urgent} urgent{counts.urgent > 1 ? "s" : ""}
            </div>
          </div>
          <div className="donut" style={{ ["--p" as string]: pct }} role="img" aria-label={`${pct} % conformes`}>
            <div>{pct}%</div>
          </div>
        </section>

        <div className="grid cols-4">
          <div className="kpi red"><div className="v">{counts.expire}</div><div className="l">Expirés</div></div>
          <div className="kpi orange"><div className="v">{counts.urgent}</div><div className="l">Urgents (&lt; 15 jours)</div></div>
          <div className="kpi yellow"><div className="v">{counts.bientot}</div><div className="l">Bientôt (≤ 30 jours)</div></div>
          <div className="kpi green"><div className="v">{counts.ok}</div><div className="l">À jour</div></div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h2>Prochaines échéances</h2>
          {upcoming.length === 0 ? (
            <div className="empty">Aucune échéance proche.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Référence</th><th>Désignation</th><th>Échéance</th><th>Statut</th></tr></thead>
                <tbody>
                  {upcoming.map((i) => {
                    const u = urgencyOf(i.date_prochaine);
                    const d = daysUntil(i.date_prochaine);
                    return (
                      <tr key={i.id} className={rowClass(u)}>
                        <td><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td>
                        <td>{i.designation}</td>
                        <td>{i.date_prochaine} {d !== null && <span className="helper">({d < 0 ? `${-d} j de retard` : `dans ${d} j`})</span>}</td>
                        <td><UrgencyTag urgency={u} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
