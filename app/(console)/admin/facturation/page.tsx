import Link from "next/link";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import { fmtDate } from "@/lib/dates";
import { fcfa, monthlyRevenue, offerAnnual, planName } from "@/lib/console";
import { PRIX_PUBLIES } from "@/lib/plans";
import { loadConsole } from "../data";

export default async function BillingPage() {
  const { s, tenants, today } = await loadConsole();
  const paying = tenants.map((t) => ({ t, m: monthlyRevenue(t, today) })).filter((x) => x.m > 0).sort((a, b) => b.m - a.m);
  const mrr = paying.reduce((n, x) => n + x.m, 0);
  const avg = paying.length ? Math.round(mrr / paying.length) : 0;
  const kpis = [
    { l: "Attendu ce mois-ci", v: fcfa(mrr), s: "si chaque client payant règle sa formule" },
    { l: "Projection sur 12 mois", v: fcfa(mrr * 12), s: "à clients constants" },
    { l: "Clients payants", v: String(paying.length), s: `sur ${tenants.length} entreprises` },
    { l: "Panier moyen", v: avg ? fcfa(avg) : "—", s: "par client et par mois" },
  ];
  return (
    <>
      <ConsoleHeader s={s} title="Facturation" sub="Revenus estimés à partir des formules actives." />
      <div className="cs-content">
        <p className="cs-alert">Montants <b>estimés</b>, pas encaissés : DIOMETRO n&apos;a pas de paiement en ligne, et aucune facture ne peut être émise tant que l&apos;entreprise n&apos;est pas immatriculée.{!PRIX_PUBLIES && " Tarifs provisoires, non publiés."}</p>
        <div className="cs-kpis">
          {kpis.map((k) => <div key={k.l} className="cs-kpi static"><span className="cs-kpi-l">{k.l}</span><span className="cs-kpi-v">{k.v}</span><span className="cs-kpi-s">{k.s}</span></div>)}
        </div>
        <section className="cs-panel">
          <div className="cs-ph"><h2>Par client</h2><span className="cs-muted">Tarif annuel de la formule, pour comparaison</span></div>
          {paying.length ? (
            <div className="cs-tw">
              <table className="cs-table">
                <thead><tr><th>Entreprise</th><th>Formule</th><th>Mensuel</th><th>Annuel</th><th>Fin d&apos;abonnement</th></tr></thead>
                <tbody>{paying.map(({ t, m }) => (
                  <tr key={t.id}>
                    <td><Link className="cs-link" href={`/admin/entreprises/${t.id}`}><b>{t.name}</b></Link></td>
                    <td><span className="cs-pill">{planName(t.plan)}</span></td>
                    <td className="cs-num">{fcfa(m)}</td>
                    <td className="cs-num">{offerAnnual(t.plan) ? fcfa(offerAnnual(t.plan)!) : "—"}</td>
                    <td>{t.plan_expires_at ? fmtDate(t.plan_expires_at) : "Sans fin"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="cs-muted">Aucun client payant pour l&apos;instant.</p>}
        </section>
      </div>
    </>
  );
}
