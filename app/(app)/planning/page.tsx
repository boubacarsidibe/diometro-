import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { UrgencyTag } from "@/components/UrgencyTag";
import { calendarGrid, groupByDay, monthLabel, parseMonth, shiftMonth } from "@/lib/planning";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";
import type { Instrument } from "@/lib/types";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const CHIP = { expire: "red", urgent: "orange", bientot: "yellow", ok: "green", none: "" } as const;

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireSession();
  const { m } = await searchParams;
  const key = parseMonth(m);
  const next = shiftMonth(key, 1);
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).neq("statut", "Réformé")
    .gte("date_prochaine", `${key}-01`).lt("date_prochaine", `${next}-01`).order("date_prochaine");
  const items = (data ?? []) as Instrument[];
  const byDay = groupByDay(items, key);
  return (
    <>
      <Topbar title="Planning d'étalonnage" subtitle={`${items.length} échéance${items.length > 1 ? "s" : ""} en ${monthLabel(key)}`}
        actions={<><Link className="btn small soft" href={`/planning?m=${shiftMonth(key, -1)}`}>← Précédent</Link><Link className="btn small soft" href="/planning">Aujourd&apos;hui</Link><Link className="btn small soft" href={`/planning?m=${next}`}>Suivant →</Link></>} />
      <div className="content stack">
        <div className="card">
          <h2 style={{ textTransform: "capitalize" }}>{monthLabel(key)}</h2>
          <div className="table-wrap">
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
        </div>
        <div className="card">
          <h2>Détail du mois</h2>
          {items.length === 0 ? <div className="empty">Aucune échéance ce mois-ci.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Échéance</th><th>Référence</th><th>Désignation</th><th>État</th></tr></thead>
              <tbody>{items.map((i) => (
                <tr key={i.id}><td>{i.date_prochaine}</td><td><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td><td>{i.designation}</td><td><UrgencyTag urgency={urgencyOf(i.date_prochaine)} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
