"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PLANS } from "@/lib/schemas";
import { fmtDate } from "@/lib/dates";
import { ManageButton, RelanceButton } from "./TenantDrawers";
import { daysSince, daysUntil, fcfa, followUps, monthlyRevenue, stateOf, type ConsoleTenant, planName } from "@/lib/console";

type Filter = "" | "paying" | "trial" | "follow";

export function ConsoleBoard({ tenants, today, middle, bottom }: {
  tenants: ConsoleTenant[]; today: string;
  middle: React.ReactNode; bottom: React.ReactNode;
}) {
  const [kf, setKf] = useState<Filter>("");
  const [q, setQ] = useState("");
  const [fs, setFs] = useState("");
  const [fp, setFp] = useState("");

  const follow = useMemo(() => new Set(followUps(tenants, today).map((f) => f.tenant.id)), [tenants, today]);
  const mrr = tenants.reduce((s, t) => s + monthlyRevenue(t, today), 0);
  const paying = tenants.filter((t) => monthlyRevenue(t, today) > 0).length;
  const trials = tenants.filter((t) => t.plan === "essai" && stateOf(t, today) === "active");
  const ending = trials.filter((t) => t.plan_expires_at && daysUntil(t.plan_expires_at, today) <= 10).length;
  const month = today.slice(0, 7);
  const newThisMonth = tenants.filter((t) => t.created_at.slice(0, 7) === month).length;
  const instruments = tenants.reduce((s, t) => s + t.instruments, 0);

  const kpis: { k: Filter; label: string; value: string; unit?: string; sub: string; tone: string }[] = [
    { k: "paying", label: "Revenu mensuel estimé", value: mrr.toLocaleString("fr-FR").replace(/ | /g, " "), unit: "FCFA", sub: `${paying} client${paying > 1 ? "s" : ""} payant${paying > 1 ? "s" : ""}`, tone: "t1" },
    { k: "", label: "Entreprises", value: String(tenants.length), sub: `+${newThisMonth} ce mois-ci`, tone: "t2" },
    { k: "trial", label: "Essais en cours", value: String(trials.length), sub: ending ? `${ending} ${ending > 1 ? "finissent" : "finit"} sous 10 jours` : "Aucun ne finit sous 10 jours", tone: "t3" },
    { k: "follow", label: "À relancer", value: String(follow.size), sub: "Inactives, essai fini ou limite dépassée", tone: "t4" },
  ];

  const rows = tenants.filter((t) => {
    const st = stateOf(t, today);
    if (q && !`${t.name} ${t.admin_email ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (fs && st !== fs) return false;
    if (fp && t.plan !== fp) return false;
    if (kf === "paying" && monthlyRevenue(t, today) === 0) return false;
    if (kf === "trial" && !(t.plan === "essai" && st === "active")) return false;
    if (kf === "follow" && !follow.has(t.id)) return false;
    return true;
  });

  return (
    <div className="cs-content">
      <div className="cs-kpis">
        {kpis.map((x) => (
          <button key={x.label} type="button" className={`cs-kpi ${x.tone}${kf === x.k && x.k ? " sel" : ""}`} aria-pressed={kf === x.k && !!x.k} onClick={() => setKf(kf === x.k ? "" : x.k)}>
            <span className="cs-kpi-l">{x.label}</span>
            <span className="cs-kpi-v">{x.value}{x.unit && <small> {x.unit}</small>}</span>
            <span className="cs-kpi-s">{x.sub}</span>
          </button>
        ))}
      </div>
      <p className="cs-muted" style={{ marginTop: -6 }}>Instruments suivis sur la plateforme : <b>{instruments.toLocaleString("fr-FR")}</b></p>

      {middle}

      <section className="cs-panel">
        <div className="cs-ph">
          <h2>Entreprises {kf && <span className="cs-muted">· filtre actif</span>}</h2>
          <div className="cs-filters" role="search">
            <input className="cs-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une entreprise" aria-label="Rechercher une entreprise" maxLength={100} />
            <select className="cs-input" value={fs} onChange={(e) => setFs(e.target.value)} aria-label="Filtrer par état">
              <option value="">Tous les états</option><option value="active">Actives</option><option value="expired">Expirées</option><option value="blocked">Bloquées</option>
            </select>
            <select className="cs-input" value={fp} onChange={(e) => setFp(e.target.value)} aria-label="Filtrer par formule">
              <option value="">Toutes les formules</option>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="cs-tw">
          <table className="cs-table">
            <thead><tr><th>Entreprise</th><th>Formule</th><th>Instruments</th><th>Revenu / mois</th><th>Dernière connexion</th><th>Fin</th><th>État</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((t) => {
                const st = stateOf(t, today);
                const left = t.plan_expires_at ? daysUntil(t.plan_expires_at, today) : null;
                const idle = daysSince(t.last_sign_in_at, today);
                const pctUse = t.max_instruments ? Math.min(100, Math.round((100 * t.instruments) / t.max_instruments)) : 8;
                const over = t.max_instruments != null && t.instruments > t.max_instruments;
                const rev = monthlyRevenue(t, today);
                return (
                  <tr key={t.id}>
                    <td><Link className="cs-link" href={`/admin/entreprises/${t.id}`}><b>{t.name}</b></Link><div className="cs-muted">{t.admin_email ?? `créée le ${fmtDate(t.created_at)}`}</div></td>
                    <td><span className="cs-pill">{planName(t.plan)}</span></td>
                    <td>
                      <div className="cs-cap-t">{t.instruments} / {t.max_instruments ?? "illimité"}{over && <span className="cs-over">Dépassement</span>}</div>
                      <div className="cs-bar"><i className={over ? "bad" : pctUse >= 85 ? "warn" : "ok"} style={{ width: `${pctUse}%` }} /></div>
                    </td>
                    <td className="cs-num">{rev ? fcfa(rev) : "—"}</td>
                    <td className={idle !== null && idle >= 7 ? "cs-late" : undefined}>{idle === null ? "—" : idle === 0 ? "Aujourd'hui" : idle === 1 ? "Hier" : `Il y a ${idle} j`}</td>
                    <td className={left !== null && left >= 0 && left <= 10 ? "cs-late" : undefined}>{t.plan_expires_at ? `${fmtDate(t.plan_expires_at)}${left !== null && left < 0 ? " · terminé" : left !== null && left <= 10 ? ` · ${left} j` : ""}` : "Sans fin"}</td>
                    <td>{st === "blocked" ? <span className="cs-tag bad">Bloquée</span> : st === "expired" ? <span className="cs-tag warn">Expirée</span> : <span className="cs-tag ok">Active</span>}</td>
                    <td><div className="cs-acts">{follow.has(t.id) && <RelanceButton t={t} today={today} />}<ManageButton t={t} today={today} /></div></td>
                  </tr>
                );
              }) : <tr><td colSpan={8} className="cs-empty">Aucune entreprise ne correspond à ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="cs-muted cs-note">Vous voyez uniquement des totaux par entreprise : le contenu métier de vos clients n&apos;est jamais accessible ici.</p>
      </section>

      {bottom}

    </div>
  );
}
