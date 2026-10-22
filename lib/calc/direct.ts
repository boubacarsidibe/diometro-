// Comparaison directe à un étalon de référence — sans calcul d'incertitude (reprise de l'ancienne version).

export type DirectInput = { emt: number; points: { ref: number; lue: number }[] };
export type DirectPointResult = { index: number; ref: number; lue: number; erreur: number; verdict: "ok" | "no" };
export type DirectResult = { points: DirectPointResult[]; global: "ok" | "no" };

export function computeDirect(i: DirectInput): DirectResult | null {
  if (!Number.isFinite(i.emt) || i.emt <= 0) return null;
  const pts: DirectPointResult[] = [];
  i.points.forEach((p, index) => {
    if (!Number.isFinite(p.ref) || !Number.isFinite(p.lue)) return;
    const erreur = p.lue - p.ref;
    pts.push({ index, ref: p.ref, lue: p.lue, erreur, verdict: Math.abs(erreur) <= i.emt ? "ok" : "no" });
  });
  if (pts.length === 0) return null;
  return { points: pts, global: pts.every((p) => p.verdict === "ok") ? "ok" : "no" };
}
