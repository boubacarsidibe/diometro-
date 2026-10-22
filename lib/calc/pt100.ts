// Thermomètres / sondes Pt100 — comparaison à un étalon corrigé (FD X 07-016),
// incertitude GUM (guide ECOMET CG-CAL-006). Formules reprises à l'identique de l'ancienne version.

export type Pt100Point = { cons: number | null; vref: number[]; vlue: number[] };
export type Pt100Input = {
  a: number; b: number; c: number; emt: number;
  resLue: number; resEt: number; uEt: number; uDerive: number; uHomog: number;
  modeRig: boolean; points: Pt100Point[];
};
export type Verdict = "ok" | "doubt" | "no";
export type Pt100PointResult = {
  index: number; cons: number | null; VrefM: number; VlueM: number; sVref: number; sVlue: number;
  Vrc: number; erreur: number; uc: number; U: number; verdict: Verdict;
};
export type Pt100Result = { points: Pt100PointResult[]; global: Verdict };

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const stdev = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

export function computePt100(i: Pt100Input): Pt100Result | null {
  const uResLue = i.resLue / 2 / Math.sqrt(3);
  const uResEt = i.resEt / 2 / Math.sqrt(3);
  const uEtCert = i.uEt / 2; // U (k=2) → u

  const out: Pt100PointResult[] = [];
  i.points.forEach((pt, index) => {
    const vrefs = pt.vref.filter(Number.isFinite);
    const vlues = pt.vlue.filter(Number.isFinite);
    if (vrefs.length < 2 || vlues.length < 2) return;

    const VrefM = mean(vrefs), VlueM = mean(vlues);
    const sVref = stdev(vrefs), sVlue = stdev(vlues);
    const Vrc = i.a * VrefM * VrefM + i.b * VrefM + i.c; // correction polynomiale de l'étalon
    const erreur = Math.abs(VlueM - Vrc);

    const uRepLue = sVlue / Math.sqrt(vlues.length);
    const uRepEt = sVref / Math.sqrt(vrefs.length);
    const uc = Math.sqrt(uResLue ** 2 + uResEt ** 2 + uEtCert ** 2 + i.uDerive ** 2 + i.uHomog ** 2 + uRepLue ** 2 + uRepEt ** 2);
    const U = 2 * uc; // k = 2

    let verdict: Verdict;
    if (i.modeRig) {
      // Mode rigoureux : erreur + U ≤ EMT (zone de garde)
      if (erreur + U <= i.emt) verdict = "ok";
      else if (erreur > i.emt) verdict = "no";
      else verdict = "doubt";
    } else {
      verdict = erreur <= i.emt ? "ok" : "no"; // Mode rapide : erreur ≤ EMT
    }
    out.push({ index, cons: pt.cons, VrefM, VlueM, sVref, sVlue, Vrc, erreur, uc, U, verdict });
  });
  if (out.length === 0) return null;
  const global: Verdict = out.every((p) => p.verdict === "ok") ? "ok" : out.some((p) => p.verdict === "no") ? "no" : "doubt";
  return { points: out, global };
}
