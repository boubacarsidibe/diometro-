import { fmt } from "@/lib/calc/parse";
import type { PipetteInput, PipetteResult } from "@/lib/calc/pipette";
import type { Pt100Input, Pt100Result, Verdict } from "@/lib/calc/pt100";
import type { DirectInput, DirectResult } from "@/lib/calc/direct";

export const VERDICT_LABEL: Record<Verdict, string> = { ok: "CONFORME", doubt: "DOUTEUX (zone d'incertitude)", no: "NON CONFORME" };
export const RESULTAT_OF: Record<Verdict, "Conforme" | "Conforme avec réserve" | "Non conforme"> = { ok: "Conforme", doubt: "Conforme avec réserve", no: "Non conforme" };
export const CONFORMITE_OF: Record<Verdict, "Oui" | "À vérifier" | "Non"> = { ok: "Oui", doubt: "À vérifier", no: "Non" };

export function describePipette(i: PipetteInput, r: PipetteResult): string {
  return `Étalonnage pipette par pesée (ISO 8655). V20 = ${fmt(r.V20, 4)} mL ± ${fmt(r.UV20 * 1000, 2)} µL (k=2). ` +
    `Justesse ${r.errPct >= 0 ? "+" : ""}${fmt(r.errPct, 3)} %, fidélité CV ${fmt(r.cvPct, 3)} %. ` +
    `EMT ±${fmt(i.emt, 2)} % → ${r.conforme ? "CONFORME" : "NON CONFORME"}. ` +
    `Conditions : ta=${i.ta} °C, P=${i.p} mbar, te=${i.te} °C, tv=${i.tv} °C. n=${r.n} mesures.`;
}

export function describePt100(i: Pt100Input, r: Pt100Result): string {
  const pts = r.points.map((p) => `${p.cons ?? `Pt${p.index + 1}`} °C : erreur ${fmt(p.erreur, 3)} °C, U ±${fmt(p.U, 3)} °C [${VERDICT_LABEL[p.verdict].split(" ")[0]}]`).join(" ; ");
  return `Étalonnage thermomètre/sonde Pt100 par comparaison à un étalon corrigé (X 07-016), incertitude GUM. ` +
    `Mode ${i.modeRig ? "rigoureux (erreur + U ≤ EMT)" : "rapide (erreur ≤ EMT)"}, EMT ±${fmt(i.emt, 2)} °C. Points : ${pts}. ${VERDICT_LABEL[r.global]}.`;
}

export function describeDirect(i: DirectInput, r: DirectResult, nom: string): string {
  const pts = r.points.map((p) => `Pt${p.index + 1} : étalon ${fmt(p.ref)} / lue ${fmt(p.lue)} / écart ${p.erreur >= 0 ? "+" : ""}${fmt(p.erreur)} [${p.verdict === "ok" ? "CONFORME" : "NON CONFORME"}]`).join(" ; ");
  return `Vérification par comparaison directe à un étalon (${nom}). Méthode simplifiée sans calcul d'incertitude. EMT ±${fmt(i.emt, 3)}. Points : ${pts}. ${r.global === "ok" ? "CONFORME" : "NON CONFORME"}.`.slice(0, 1990);
}
