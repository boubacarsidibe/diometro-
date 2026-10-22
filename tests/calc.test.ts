import { describe, expect, it } from "vitest";
import { computePipette, rhoAir, rhoEau } from "@/lib/calc/pipette";
import { computePt100 } from "@/lib/calc/pt100";
import { computeDirect } from "@/lib/calc/direct";
import { CATALOG, catalogById } from "@/lib/calc/catalog";

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// Valeurs de référence calculées par l'ancienne version (vérifiées par tests/calc-legacy.test.ts).
describe("calculateurs : valeurs de référence", () => {
  it("masse volumique de l'eau (Tanaka) et de l'air", () => {
    expect(near(rhoEau(20), 0.998203, 1e-5)).toBe(true);
    expect(rhoAir(20, 1013.25, null, false)).toBeGreaterThan(0.0012);
    expect(rhoAir(20, 1013.25, 50, true)).toBeLessThan(rhoAir(20, 1013.25, null, false)); // l'air humide est plus léger
  });
  it("pipette 10 mL (ISO 8655)", () => {
    const r = computePipette({ vnom: 10, ta: 21, p: 1009, te: 20.5, tv: 21, alpha: 0.000005, emt: 0.8, resBal: 0.001, resTh: 0.2, resBaro: 1, h: 38.5, useHumidite: true, masses: [9.9812, 9.9798, 9.9825, 9.9807, 9.9819, 9.9801, 9.9815, 9.9809, 9.9822, 9.9804] })!;
    expect(r.n).toBe(10);
    expect(near(r.V20, 10.010531638521638)).toBe(true);
    expect(near(r.errPct, 0.10531638521637632)).toBe(true);
    expect(near(r.cvPct, 0.009057795265192297)).toBe(true);
    expect(near(r.UV20, 0.0008511877025095565)).toBe(true);
    expect(r.conforme).toBe(true);
  });
  it("pipette : refuse un calcul sans assez de données, détecte la non-conformité", () => {
    const base = { vnom: 10, ta: 21, p: 1009, te: 20.5, tv: 21, alpha: 0.000005, emt: 0.05, resBal: 0.001, resTh: 0.2, resBaro: 1, h: null, useHumidite: false };
    expect(computePipette({ ...base, masses: [9.98] })).toBeNull();
    expect(computePipette({ ...base, masses: [9.98, 9.98], vnom: NaN })).toBeNull();
    expect(computePipette({ ...base, masses: [9.9812, 9.9798, 9.9825] })!.conforme).toBe(false); // EMT 0,05 % trop stricte
  });
  it("Pt100 : mode rigoureux, zone de garde « douteux »", () => {
    const r = computePt100({ a: -0.000004, b: 1.0006, c: 0.0101, emt: 1, resLue: 0.01, resEt: 0.01, uEt: 0.05, uDerive: 0.05, uHomog: 0.1, modeRig: true,
      points: [{ cons: 20, vref: [20.01, 20.02, 20.0, 20.01, 20.02], vlue: [20.2, 20.25, 20.18, 20.22, 20.21] }, { cons: 50, vref: [50.0, 50.01, 50.02], vlue: [50.9, 50.95, 50.92] }] })!;
    expect(r.points.map((p) => p.verdict)).toEqual(["ok", "doubt"]);
    expect(r.global).toBe("doubt");
    expect(near(r.points[0].erreur, 0.1794947205759989)).toBe(true);
    expect(near(r.points[1].U, 0.2313967252241151)).toBe(true);
  });
  it("Pt100 : mode rapide ignore l'incertitude ; points incomplets ignorés", () => {
    const pts = [{ cons: 50, vref: [50.0, 50.01, 50.02], vlue: [50.9, 50.95, 50.92] }, { cons: 80, vref: [80], vlue: [80.1] }];
    const rapide = computePt100({ a: 0, b: 1, c: 0, emt: 1, resLue: 0.01, resEt: 0.01, uEt: 0.05, uDerive: 0.05, uHomog: 0.1, modeRig: false, points: pts })!;
    expect(rapide.points).toHaveLength(1);
    expect(rapide.global).toBe("ok");
    expect(computePt100({ a: 0, b: 1, c: 0, emt: 1, resLue: 0, resEt: 0, uEt: 0, uDerive: 0, uHomog: 0, modeRig: true, points: [] })).toBeNull();
  });
  it("comparaison directe", () => {
    const r = computeDirect({ emt: 0.05, points: [{ ref: 10, lue: 10.02 }, { ref: 20, lue: 19.93 }, { ref: NaN, lue: 5 }] })!;
    expect(r.points).toHaveLength(2);
    expect(r.points.map((p) => p.verdict)).toEqual(["ok", "no"]);
    expect(r.global).toBe("no");
    expect(computeDirect({ emt: 0, points: [{ ref: 1, lue: 1 }] })).toBeNull();
    expect(computeDirect({ emt: 1, points: [] })).toBeNull();
  });
  it("catalogue : 28 types, un calculateur valide, procédure renseignée", () => {
    expect(CATALOG).toHaveLength(28);
    expect(catalogById("pipette")!.calculateur).toBe("pipette");
    expect(catalogById("thermometre")!.calculateur).toBe("pt100");
    expect(catalogById("balance")!.calculateur).toBe("direct");
    expect(catalogById("autre")!.calculateur).toBeNull();
    for (const c of CATALOG.filter((c) => c.id !== "autre")) {
      expect(c.nom.length).toBeGreaterThan(1);
      expect(c.norme.length).toBeGreaterThan(5);
      expect(c.demarche.length).toBeGreaterThan(0);
    }
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length);
  });
});
