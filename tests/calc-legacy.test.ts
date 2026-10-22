import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computePipette } from "@/lib/calc/pipette";
import { computePt100 } from "@/lib/calc/pt100";
import { computeDirect } from "@/lib/calc/direct";

// Test différentiel : on exécute les fonctions ORIGINALES de l'ancienne version (legacy/index.html)
// avec un faux DOM, et on compare leurs résultats à ceux du portage TypeScript.
const LEGACY = "legacy/index.html";

function extract(src: string, name: string): string {
  const lines = src.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`function ${name}(`));
  if (start < 0) throw new Error(`fonction introuvable : ${name}`);
  let end = start;
  while (lines[end] !== "}") end++;
  return lines.slice(start, end + 1).join("\n");
}

function loadLegacy() {
  const src = readFileSync(LEGACY, "utf8");
  const code = ["parseNumber", "pipRhoEau", "pipRhoAir", "computePipette", "computePt100", "computeDirect"].map((n) => extract(src, n)).join("\n");
  const factory = new Function(
    "document",
    `let _pipLastResult=null,_pt100LastResult=null,_directLastResult=null,_etalonDirectCurrent=null;
     ${code}
     return { computePipette, computePt100, computeDirect, pip:()=>_pipLastResult, pt:()=>_pt100LastResult, direct:()=>_directLastResult };`,
  );
  return factory as (doc: unknown) => {
    computePipette: () => void; computePt100: () => void; computeDirect: () => void;
    pip: () => any; pt: () => any; direct: () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}

function fakeDoc(values: Record<string, string>, checks: Record<string, boolean> = {}) {
  const els = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const el = (id: string) => {
    if (!els.has(id)) els.set(id, { value: values[id] ?? "", checked: checks[id] ?? false, innerHTML: "", disabled: false, classList: { add() {}, remove() {} } });
    return els.get(id);
  };
  const sinks = /^(pip-results|pip-save-btn|pt-results|pt-save-btn|direct-results|direct-save-btn|pt-pt-result-\d+|direct-pt-result-\d+)$/;
  return { getElementById: (id: string) => (id in values || id in checks || sinks.test(id) ? el(id) : null) };
}

// Générateur pseudo-aléatoire déterministe
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

describe.skipIf(!existsSync(LEGACY))("calculateurs : identiques à l'ancienne version", () => {
  const load = loadLegacy();

  it("pipette (ISO 8655) — 200 cas aléatoires", () => {
    const r = rng(42);
    for (let k = 0; k < 200; k++) {
      const vnom = [0.1, 1, 5, 10][Math.floor(r() * 4)];
      const n = 2 + Math.floor(r() * 9);
      const masses = Array.from({ length: n }, () => vnom * (0.97 + r() * 0.06) * 0.9982);
      const useH = r() > 0.5;
      const p = { vnom, ta: 18 + r() * 8, p: 990 + r() * 40, te: 18 + r() * 5, tv: 18 + r() * 8, alpha: 5e-6 + r() * 2e-5, emt: 0.3 + r(), resBal: 0.0001 + r() * 0.001, resTh: 0.1 + r() * 0.2, resBaro: 0.5 + r(), h: 20 + r() * 60 };
      const values: Record<string, string> = {
        "pip-vnom": String(p.vnom), "pip-ta": String(p.ta), "pip-p": String(p.p), "pip-te": String(p.te), "pip-tv": String(p.tv),
        "pip-alpha": String(p.alpha), "pip-emt": String(p.emt), "pip-res-bal": String(p.resBal), "pip-res-th": String(p.resTh),
        "pip-res-baro": String(p.resBaro), "pip-h": String(p.h), "pip-nb": String(n),
      };
      masses.forEach((m, i) => (values[`pip-m-${i}`] = String(m)));
      const leg = load(fakeDoc(values, { "pip-use-h": useH }));
      leg.computePipette();
      const old = leg.pip();
      const mine = computePipette({ ...p, useHumidite: useH, masses });
      expect(old).toBeTruthy();
      expect(mine).toBeTruthy();
      for (const key of ["mMoy", "sM", "rhoE", "rhoA", "Z", "Y", "V20", "errAbs", "errPct", "cvPct", "ucV20", "UV20"] as const) {
        expect(close(old[key], mine![key]), `${key}: ${old[key]} vs ${mine![key]}`).toBe(true);
      }
      expect(mine!.conforme).toBe(old.conforme);
    }
  });

  it("Pt100 (X 07-016, GUM) — 200 cas aléatoires, modes rapide et rigoureux", () => {
    const r = rng(7);
    for (let k = 0; k < 200; k++) {
      const nrep = 2 + Math.floor(r() * 5), nb = 1 + Math.floor(r() * 4), modeRig = r() > 0.5;
      const p = { a: -0.000004, b: 1.0006, c: 0.0101, emt: 0.2 + r() * 1.2, resLue: 0.01, resEt: 0.01, uEt: 0.05, uDerive: 0.05, uHomog: 0.1 };
      const values: Record<string, string> = { "pt-a": String(p.a), "pt-b": String(p.b), "pt-c": String(p.c), "pt-emt": String(p.emt), "pt-res-lue": "0.01", "pt-res-et": "0.01", "pt-u-et": "0.05", "pt-derive": "0.05", "pt-homog": "0.10", "pt-npts": String(nb), "pt-nrep": String(nrep) };
      const points = Array.from({ length: nb }, (_, i) => {
        const cons = 20 + i * 30;
        const vref = Array.from({ length: nrep }, () => cons + (r() - 0.5) * 0.1);
        const vlue = Array.from({ length: nrep }, () => cons + (r() - 0.5) * 1.6);
        values[`pt-cons-${i}`] = String(cons);
        vref.forEach((v, j) => (values[`pt-vref-${i}-${j}`] = String(v)));
        vlue.forEach((v, j) => (values[`pt-vlue-${i}-${j}`] = String(v)));
        return { cons, vref, vlue };
      });
      const leg = load(fakeDoc(values, { "pt-mode-rig": modeRig }));
      leg.computePt100();
      const old = leg.pt();
      const mine = computePt100({ ...p, modeRig, points });
      expect(old).toBeTruthy();
      expect(mine!.points).toHaveLength(old.points.length);
      old.points.forEach((o: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const m = mine!.points[idx];
        for (const key of ["VrefM", "VlueM", "sVref", "sVlue", "Vrc", "erreur", "uc", "U"] as const) {
          expect(close(o[key], m[key]), `${key}: ${o[key]} vs ${m[key]}`).toBe(true);
        }
        expect(m.verdict).toBe(o.verdictCls);
      });
      expect(mine!.global).toBe(old.globalOk ? "ok" : old.points.some((o: any) => o.verdictCls === "no") ? "no" : "doubt"); // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  });

  it("comparaison directe — 200 cas aléatoires", () => {
    const r = rng(99);
    for (let k = 0; k < 200; k++) {
      const nb = 1 + Math.floor(r() * 6), emt = 0.1 + r();
      const values: Record<string, string> = { "direct-emt": String(emt), "direct-npts": String(nb) };
      const pts = Array.from({ length: nb }, (_, i) => {
        const ref = r() * 100, lue = ref + (r() - 0.5) * 3;
        values[`direct-ref-${i}`] = String(ref); values[`direct-lue-${i}`] = String(lue);
        return { ref, lue };
      });
      const leg = load(fakeDoc(values));
      leg.computeDirect();
      const old = leg.direct();
      const mine = computeDirect({ emt, points: pts });
      expect(mine!.global === "ok").toBe(old.globalOk);
      old.points.forEach((o: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(close(o.erreur, mine!.points[idx].erreur)).toBe(true);
        expect(mine!.points[idx].verdict).toBe(o.verdictCls);
      });
    }
  });
});
