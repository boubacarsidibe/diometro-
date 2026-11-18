import Link from "next/link";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import { ManageButton, RelanceButton } from "@/components/console/TenantDrawers";
import { fmtDate } from "@/lib/dates";
import { daysUntil, fcfa, offerMonthly, stateOf, type ConsoleTenant, planName } from "@/lib/console";
import { loadConsole } from "../data";

export default async function SubscriptionsPage() {
  const { s, tenants, today } = await loadConsole();
  const live = tenants.filter((t) => stateOf(t, today) !== "blocked");
  const dated = live.filter((t) => t.plan_expires_at).sort((a, b) => a.plan_expires_at!.localeCompare(b.plan_expires_at!));
  const groups: { title: string; hint: string; list: ConsoleTenant[] }[] = [
    { title: "Échues", hint: "Comptes en lecture seule jusqu'au renouvellement", list: dated.filter((t) => daysUntil(t.plan_expires_at!, today) < 0) },
    { title: "Dans les 30 jours", hint: "À renouveler bientôt", list: dated.filter((t) => { const d = daysUntil(t.plan_expires_at!, today); return d >= 0 && d <= 30; }) },
    { title: "Plus tard", hint: "", list: dated.filter((t) => daysUntil(t.plan_expires_at!, today) > 30) },
  ];
  const noEnd = live.filter((t) => !t.plan_expires_at).length;
  return (
    <>
      <ConsoleHeader s={s} title="Abonnements" sub="Échéances des essais et des formules, de la plus proche à la plus lointaine." />
      <div className="cs-content">
        {groups.map((g) => (
          <section key={g.title} className="cs-panel">
            <div className="cs-ph"><h2>{g.title} <span className="cs-muted">· {g.list.length}</span></h2>{g.hint && <span className="cs-muted">{g.hint}</span>}</div>
            {g.list.length ? (
              <div className="cs-tw">
                <table className="cs-table">
                  <thead><tr><th>Entreprise</th><th>Formule</th><th>Fin</th><th>Prix mensuel</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>{g.list.map((t) => {
                    const d = daysUntil(t.plan_expires_at!, today), p = offerMonthly(t.plan);
                    return (
                      <tr key={t.id}>
                        <td><Link className="cs-link" href={`/admin/entreprises/${t.id}`}><b>{t.name}</b></Link><div className="cs-muted">{t.admin_email ?? "—"}</div></td>
                        <td><span className="cs-pill">{planName(t.plan)}</span></td>
                        <td className={d <= 10 ? "cs-late" : undefined}>{fmtDate(t.plan_expires_at)} · {d < 0 ? `terminé depuis ${-d} j` : d === 0 ? "aujourd'hui" : `dans ${d} j`}</td>
                        <td className="cs-num">{p ? fcfa(p) : "—"}</td>
                        <td><div className="cs-acts"><RelanceButton t={t} today={today} /><ManageButton t={t} today={today} label="Prolonger" /></div></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : <p className="cs-muted">Aucune.</p>}
          </section>
        ))}
        {noEnd > 0 && <p className="cs-muted">{noEnd} entreprise{noEnd > 1 ? "s" : ""} sans date de fin (non comptée{noEnd > 1 ? "s" : ""} ci-dessus). Les entreprises bloquées sont exclues.</p>}
      </div>
    </>
  );
}
