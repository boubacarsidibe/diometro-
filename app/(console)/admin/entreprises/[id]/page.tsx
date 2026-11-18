import Link from "next/link";
import { notFound } from "next/navigation";
import { ConsoleHeader } from "@/components/console/ConsoleHeader";
import { JournalList } from "@/components/console/JournalList";
import { ManageButton, RelanceButton } from "@/components/console/TenantDrawers";
import { fmtDate } from "@/lib/dates";
import { daysSince, daysUntil, fcfa, followUps, monthlyRevenue, stateOf, planName } from "@/lib/console";
import { loadConsole, loadJournal } from "../../data";

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { s, tenants, today } = await loadConsole();
  const t = tenants.find((x) => x.id === id);
  if (!t) notFound();
  const { entries, journalReady } = await loadJournal(t.id);
  const st = stateOf(t, today);
  const left = t.plan_expires_at ? daysUntil(t.plan_expires_at, today) : null;
  const idle = daysSince(t.last_sign_in_at, today);
  const rev = monthlyRevenue(t, today);
  const reason = followUps([t], today)[0]?.reason;
  const pct = t.max_instruments ? Math.min(100, Math.round((100 * t.instruments) / t.max_instruments)) : 8;
  const over = t.max_instruments != null && t.instruments > t.max_instruments;

  return (
    <>
      <ConsoleHeader s={s} title={t.name} sub={<><Link className="cs-link" href="/admin">Vue d&apos;ensemble</Link> · fiche entreprise</>}>
        <div className="cs-acts"><RelanceButton t={t} today={today} /><ManageButton t={t} today={today} label="Gérer l'abonnement" primary /></div>
      </ConsoleHeader>
      <div className="cs-content">
        {reason && <p className="cs-alert">À relancer : <b>{reason}</b></p>}
        <div className="cs-grid2">
          <section className="cs-panel">
            <div className="cs-ph"><h2>Identité</h2>{st === "blocked" ? <span className="cs-tag bad">Bloquée</span> : st === "expired" ? <span className="cs-tag warn">Expirée</span> : <span className="cs-tag ok">Active</span>}</div>
            <dl className="cs-dl">
              <dt>Administrateur</dt><dd>{t.admin_email ? <span className="cs-sel">{t.admin_email}</span> : "—"}</dd>
              <dt>Secteur</dt><dd>{t.sector || "—"}</dd>
              <dt>Inscription</dt><dd>{fmtDate(t.created_at, "—", s.timeZone)}</dd>
              <dt>Utilisateurs</dt><dd>{t.users}</dd>
              <dt>Dernière connexion</dt><dd>{idle === null ? "—" : idle === 0 ? "Aujourd'hui" : idle === 1 ? "Hier" : `Il y a ${idle} jours`}</dd>
            </dl>
          </section>
          <section className="cs-panel">
            <div className="cs-ph"><h2>Abonnement</h2><span className="cs-pill">{planName(t.plan)}</span></div>
            <dl className="cs-dl">
              <dt>Fin</dt><dd>{t.plan_expires_at ? `${fmtDate(t.plan_expires_at)}${left !== null ? (left < 0 ? ` · terminé depuis ${-left} j` : ` · dans ${left} j`) : ""}` : "Sans fin"}</dd>
              <dt>Revenu estimé</dt><dd>{rev ? `${fcfa(rev)} / mois` : "—"}</dd>
              <dt>Instruments</dt><dd>{t.instruments} / {t.max_instruments ?? "illimité"}{over && <span className="cs-over">Dépassement</span>}<div className="cs-bar" style={{ marginTop: 6 }}><i className={over ? "bad" : pct >= 85 ? "warn" : "ok"} style={{ width: `${pct}%` }} /></div></dd>
            </dl>
          </section>
        </div>
        <section className="cs-panel">
          <div className="cs-ph"><h2>Historique</h2><span className="cs-muted">Inscription, modifications et relances</span></div>
          <JournalList entries={entries} ready={journalReady} tz={s.timeZone} showTenant={false} />
        </section>
        <p className="cs-muted">Vous voyez uniquement des totaux : le contenu métier de cette entreprise n&apos;est jamais accessible ici.</p>
      </div>
    </>
  );
}
