import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag } from "@/components/UrgencyTag";
import { calendarGrid, currentMonth, groupByDay, monthLabel, monthShort, parseMonth, shiftMonth } from "@/lib/planning";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, urgencyOf } from "@/lib/status";
import type { Instrument } from "@/lib/types";
import { fmtDate, todayIn } from "@/lib/dates";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const CHIP = { expire: "red", urgent: "orange", bientot: "yellow", ok: "green", none: "" } as const;

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const s = await requireSession();
  const { m } = await searchParams;
  const key = parseMonth(m);
  const next = shiftMonth(key, 1);
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).neq("statut", "Réformé")
    .gte("date_prochaine", `${key}-01`).lt("date_prochaine", `${next}-01`).order("date_prochaine");
  const items = (data ?? []) as Instrument[];
  const byDay = groupByDay(items, key);
  // Charge de travail : échéances des 12 prochains mois.
  const start = currentMonth();
  const end = shiftMonth(start, 12);
  const { data: load } = await supabase.from("instruments").select("date_prochaine").is("deleted_at", null).eq("statut", "En service").gte("date_prochaine", `${start}-01`).lt("date_prochaine", `${end}-01`);
  const perMonth = Array.from({ length: 12 }, (_, i) => shiftMonth(start, i)).map((m) => ({ m, n: (load ?? []).filter((r) => r.date_prochaine?.startsWith(m)).length }));
  const peak = Math.max(1, ...perMonth.map((x) => x.n));
  // Instruments en service dont l'échéance est déjà passée : ils n'apparaissent dans aucun mois à venir.
  const today = todayIn(s.timeZone);
  const { data: lateData } = await supabase.from("instruments").select("*").is("deleted_at", null).eq("statut", "En service").lt("date_prochaine", today).order("date_prochaine");
  const late = (lateData ?? []) as Instrument[];
  return (
    <>
      <Topbar title="Planning d'étalonnage" subtitle={`${items.length} échéance${items.length > 1 ? "s" : ""} en ${monthLabel(key)}`}
        actions={<><Link className="btn small soft" href={`/planning?m=${shiftMonth(key, -1)}`}>← Précédent</Link><Link className="btn small soft" href="/planning">Aujourd&apos;hui</Link><Link className="btn small soft" href={`/planning?m=${next}`}>Suivant →</Link></>} />
      <div className="content stack">
        <div className="card">
          <h2>En retard{late.length > 0 ? ` (${late.length})` : ""}</h2>
          {late.length === 0 ? <div className="empty">Aucun instrument en service n&apos;est en retard.</div> : (
            <div className="table-wrap"><table className="cards">
              <thead><tr><th>Échéance</th><th>Retard</th><th>Référence</th><th>Désignation</th></tr></thead>
              <tbody>{late.map((i) => (
                <tr key={i.id} className="row-red"><td data-label="Échéance">{fmtDate(i.date_prochaine)}</td><td className="c-badge"><span className="tag red">{-(daysUntil(i.date_prochaine) ?? 0)} j de retard</span></td><td className="c-main"><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td><td className="c-sub">{i.designation}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
        <div className="card">
          <h2 style={{ textTransform: "capitalize" }}>{monthLabel(key)}</h2>
          <div className="table-wrap cal-wrap">
            <table className="cal">
              <thead><tr>{DAYS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
              <tbody>{calendarGrid(key).map((week, wi) => (
                <tr key={wi}>{week.map((day, di) => (
                  <td key={di} className={day ? "" : "empty-day"}>
                    {day && <div className="dnum">{day}</div>}
                    {day && (byDay.get(day) ?? []).map((i) => (
                      <Link key={i.id} href={`/instruments/${i.id}`} className={`chip ${CHIP[urgencyOf(i.date_prochaine)]}`} title={i.designation}>{i.ref}</Link>
                    ))}
                  </td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
          {/* Téléphone : agenda (jours qui ont une échéance) à la place de la grille de 7 colonnes */}
          <div className="agenda">
            {[...byDay.keys()].sort((a, b) => a - b).length === 0 && <div className="empty">Aucune échéance ce mois-ci.</div>}
            {[...byDay.keys()].sort((a, b) => a - b).map((day) => {
              const iso = `${key}-${String(day).padStart(2, "0")}`;
              const wd = new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
              return (
                <div className="agenda-day" key={day}>
                  <div className={`agenda-date${iso === today ? " today" : ""}`}><small>{wd}</small><b>{day}</b></div>
                  <div className="agenda-items">
                    {(byDay.get(day) ?? []).map((i) => (
                      <Link key={i.id} href={`/instruments/${i.id}`} className="agenda-item">
                        <span><span className="ai-ref">{i.ref}</span><br /><span className="ai-des">{i.designation}</span></span>
                        <UrgencyTag urgency={urgencyOf(i.date_prochaine)} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <h2>Charge de travail — 12 prochains mois</h2>
          <div className="load-chart" style={{ display: "flex", alignItems: "flex-end", height: 150 }} role="img" aria-label="Nombre d'échéances par mois">
            {perMonth.map(({ m, n }) => (
              <Link key={m} href={`/planning?m=${m}`} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", textDecoration: "none", height: "100%" }} title={`${monthLabel(m)} : ${n} échéance(s)`}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)" }}>{n}</span>
                <div style={{ width: "100%", height: `${Math.max(3, (n / peak) * 100)}%`, background: m === key ? "var(--accent)" : "var(--accent2)", borderRadius: 6 }} />
                <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{monthShort(m)}</span>
              </Link>
            ))}
          </div>
          <p className="helper" style={{ marginTop: 8 }}>Cliquez sur une barre pour afficher les instruments du mois.</p>
        </div>
        {/* Sur téléphone, l'agenda ci-dessus montre déjà ce détail */}
        <div className="card hide-mobile">
          <h2>Détail du mois</h2>
          {items.length === 0 ? <div className="empty">Aucune échéance ce mois-ci.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Échéance</th><th>Référence</th><th>Désignation</th><th>État</th></tr></thead>
              <tbody>{items.map((i) => (
                <tr key={i.id}><td>{fmtDate(i.date_prochaine)}</td><td><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td><td>{i.designation}</td><td><UrgencyTag urgency={urgencyOf(i.date_prochaine)} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
