import { conversion, followUps, signupsByMonth, type ConsoleTenant } from "@/lib/console";
import { OFFERS, PRIX_PUBLIES } from "@/lib/plans";

// Graphique des inscriptions, jauge de conversion, liste à relancer et répartition par formule (rendu serveur).
export function consoleSections(tenants: ConsoleTenant[], today: string) {
  const months = signupsByMonth(tenants, today);
  const conv = conversion(tenants, today);
  const follow = followUps(tenants, today);

  const max = Math.max(4, ...months.map((m) => m.count));
  const W = 640, H = 240, L = 34, B = 206, T = 16, bw = (W - L - 8) / 12;
  const plans = OFFERS.map((o) => ({ nom: o.nom, n: tenants.filter((t) => t.plan === o.id).length }));
  const trialCount = tenants.filter((t) => t.plan === "essai").length;

  const pct = conv.rate ?? 0, n = 22, cx = 130, cy = 138, R = 118;

  const chart = (
    <div className="cs-row2">
      <section className="cs-panel">
        <div className="cs-ph"><h2>Inscriptions par mois</h2><span className="cs-muted">12 derniers mois</span></div>
        <svg className="cs-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Inscriptions par mois : ${months.map((m) => `${m.label} ${m.count}`).join(", ")}`}>
          <defs><linearGradient id="cs-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7735f" /><stop offset="1" stopColor="#d8331d" /></linearGradient></defs>
          {[0, 0.5, 1].map((f) => {
            const y = B - (B - T) * f;
            return (<g key={f}><line x1={L} x2={W - 8} y1={y} y2={y} stroke="currentColor" strokeOpacity=".12" /><text x={L - 8} y={y + 4} fontSize="11" textAnchor="end" fill="currentColor" fillOpacity=".6">{Math.round(max * f)}</text></g>);
          })}
          {months.map((m, i) => {
            const h = ((B - T) * m.count) / max;
            return (
              <g key={i}>
                <rect x={L + i * bw + bw * 0.22} y={B - h} width={bw * 0.56} height={h} rx={5} fill="url(#cs-bar)"><title>{`${m.label} : ${m.count} inscription(s)`}</title></rect>
                <text x={L + i * bw + bw / 2} y={B + 20} fontSize="11" textAnchor="middle" fill="currentColor" fillOpacity=".6">{m.label}</text>
              </g>
            );
          })}
        </svg>
      </section>
      <section className="cs-panel">
        <div className="cs-ph"><h2>Conversion essai vers payant</h2></div>
        <svg className="cs-gauge" viewBox="0 0 260 166" role="img" aria-label={conv.rate === null ? "Pas encore d'essai terminé" : `${Math.round(pct * 100)} % des essais deviennent clients`}>
          {Array.from({ length: n }, (_, i) => {
            const a = Math.PI * (1 - i / (n - 1)), on = conv.rate !== null && i / (n - 1) <= pct + 1e-6;
            return <line key={i} x1={cx + Math.cos(a) * (R - 20)} y1={cy - Math.sin(a) * (R - 20)} x2={cx + Math.cos(a) * R} y2={cy - Math.sin(a) * R} stroke={on ? "#f2462e" : "currentColor"} strokeOpacity={on ? 1 : 0.13} strokeWidth={9} strokeLinecap="round" />;
          })}
          <text x={cx} y={cy - 18} textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">{conv.rate === null ? "—" : `${Math.round(pct * 1000) / 10} %`}</text>
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11.5" fill="currentColor" fillOpacity=".6">{conv.rate === null ? "aucun essai terminé pour l'instant" : "des essais deviennent clients"}</text>
        </svg>
        <div className="cs-mini">
          <div><small>Inscrites depuis 30 j et plus</small><b>{conv.eligible}</b></div>
          <div><small>Passées à une formule</small><b>{conv.converted}</b></div>
        </div>
      </section>
    </div>
  );

  const bottom = (
    <div className="cs-row2">
      <section className="cs-panel">
        <div className="cs-ph"><h2>À relancer</h2><span className="cs-muted">{follow.length}</span></div>
        {follow.length ? (
          <ul className="cs-list">{follow.map((f) => <li key={f.tenant.id}><span><b>{f.tenant.name}</b><br /><span className="cs-muted">{f.reason}</span></span>{f.tenant.admin_email && <span className="cs-muted">{f.tenant.admin_email}</span>}</li>)}</ul>
        ) : <p className="cs-muted">Personne à relancer pour l&apos;instant.</p>}
      </section>
      <section className="cs-panel">
        <div className="cs-ph"><h2>Répartition par formule</h2></div>
        <ul className="cs-plans">
          {[{ nom: "Essai", n: trialCount }, ...plans].filter((p) => p.n > 0).map((p) => (
            <li key={p.nom}><div className="cs-plans-l"><span>{p.nom}</span><b>{p.n}</b></div><div className="cs-bar"><i style={{ width: `${Math.round((100 * p.n) / Math.max(1, tenants.length))}%` }} /></div></li>
          ))}
        </ul>
        {!PRIX_PUBLIES && <p className="cs-muted cs-note">Revenus estimés avec les tarifs provisoires du 14/11 (non publiés), hors paiements réellement encaissés.</p>}
      </section>
    </div>
  );

  return { chart, bottom };
}
