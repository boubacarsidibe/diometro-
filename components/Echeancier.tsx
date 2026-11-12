// Échéancier d'exemple de l'accueil : une règle graduée de 45 jours de retard à 90 jours d'avance.
// Données fictives et fixes (aucun appel à la base) : la page d'accueil est publique.
const MIN = -45;
const MAX = 90;
const SAMPLE_DAYS = [-38, -27, -12, -5, -2, 3, 6, 9, 11, 14, 17, 19, 22, 24, 27, 29, 33, 36, 41, 45, 48, 52, 57, 61, 66, 70, 74, 79, 83, 86, 88];
const pos = (d: number) => ((d - MIN) / (MAX - MIN)) * 100;
const tone = (d: number) => (d < 0 ? "red" : d < 15 ? "orange" : d <= 30 ? "yellow" : "green");
const LABELS: { d: number; text: string; optional?: boolean }[] = [
  { d: -30, text: "−30 j", optional: true }, { d: 15, text: "15 j" }, { d: 30, text: "30 j" }, { d: 60, text: "60 j", optional: true }, { d: 90, text: "90 j" },
];

export function Echeancier() {
  const stacked = new Map<number, number>();
  const ticks = [];
  for (let t = MIN; t <= MAX; t += 5) ticks.push(t);
  return (
    <div className="ech" role="img" aria-label="Exemple d'échéancier : instruments expirés à gauche, échéances proches au centre, instruments à jour à droite.">
      <div className="ech-zone red" style={{ left: 0, width: `${pos(0)}%` }} />
      <div className="ech-zone orange" style={{ left: `${pos(0)}%`, width: `${pos(15) - pos(0)}%` }} />
      <div className="ech-zone yellow" style={{ left: `${pos(15)}%`, width: `${pos(30) - pos(15)}%` }} />
      <div className="ech-axis" />
      {ticks.map((t) => <div key={t} className={`ech-tick${t % 15 === 0 ? " major" : ""}`} style={{ left: `${pos(t)}%` }} />)}
      {LABELS.map((l) => <div key={l.d} className={`ech-label${l.optional ? " optional" : ""}`} style={{ left: `${pos(l.d)}%` }}>{l.text}</div>)}
      <div className="ech-today" style={{ left: `${pos(0)}%` }} />
      <div className="ech-today-label" style={{ left: `${pos(0)}%` }}>Aujourd&apos;hui</div>
      {SAMPLE_DAYS.map((d, i) => {
        const bin = Math.round(d / 3);
        const n = (stacked.get(bin) ?? 0) + 1;
        stacked.set(bin, n);
        return <span key={d} className={`ech-mark ${tone(d)}`} style={{ left: `${pos(d)}%`, bottom: 27 + (n - 1) * 15, animationDelay: `${60 + i * 14}ms` }} />;
      })}
    </div>
  );
}
