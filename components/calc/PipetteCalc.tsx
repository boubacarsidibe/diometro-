"use client";
import { useMemo, useState } from "react";
import { computePipette } from "@/lib/calc/pipette";
import { fmt, parseNumber } from "@/lib/calc/parse";
import { NumField, Row, SaveBar, VerdictBadge, range } from "@/components/calc/ui";

export function PipetteCalc({ instrumentId, emt = "" }: { instrumentId: string; emt?: string }) {
  const [f, setF] = useState({ vnom: "10", ta: "21", p: "1009", te: "20,5", tv: "21", alpha: "0,000005", emt, resBal: "0,001", resTh: "0,2", resBaro: "1", h: "38,5" });
  const [useH, setUseH] = useState(false);
  const [nb, setNb] = useState(10);
  const [masses, setMasses] = useState<string[]>(Array(20).fill(""));
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const input = useMemo(() => ({
    vnom: parseNumber(f.vnom), ta: parseNumber(f.ta), p: parseNumber(f.p), te: parseNumber(f.te), tv: parseNumber(f.tv), alpha: parseNumber(f.alpha),
    emt: parseNumber(f.emt), resBal: parseNumber(f.resBal), resTh: parseNumber(f.resTh), resBaro: parseNumber(f.resBaro),
    h: Number.isFinite(parseNumber(f.h)) ? parseNumber(f.h) : null, useHumidite: useH,
    masses: masses.slice(0, nb).map(parseNumber).filter(Number.isFinite),
  }), [f, useH, nb, masses]);
  const r = useMemo(() => (Object.values({ e: input.emt, a: input.alpha, b: input.resBal, c: input.resTh, d: input.resBaro, p: input.p, tv: input.tv }).every(Number.isFinite) ? computePipette(input) : null), [input]);

  return (
    <div className="grid cols-2" style={{ alignItems: "start" }}>
      <div className="card">
        <h2>Conditions et paramètres</h2>
        <div className="grid cols-2">
          <NumField id="vnom" label="Volume nominal testé" unit="mL" value={f.vnom} onChange={set("vnom")} />
          <NumField id="emt" label="EMT" unit="%" value={f.emt} onChange={set("emt")} />
          <NumField id="ta" label="T° air" unit="°C" value={f.ta} onChange={set("ta")} />
          <NumField id="p" label="Pression" unit="mbar" value={f.p} onChange={set("p")} />
          <NumField id="te" label="T° eau" unit="°C" value={f.te} onChange={set("te")} />
          <NumField id="tv" label="T° pipette" unit="°C" value={f.tv} onChange={set("tv")} />
          <NumField id="alpha" label="α matériel" unit="1/°C" value={f.alpha} onChange={set("alpha")} />
          <NumField id="resBal" label="Résolution balance" unit="g" value={f.resBal} onChange={set("resBal")} />
          <NumField id="resTh" label="Résolution thermomètre" unit="°C" value={f.resTh} onChange={set("resTh")} />
          <NumField id="resBaro" label="Résolution baromètre" unit="mbar" value={f.resBaro} onChange={set("resBaro")} />
        </div>
        <label style={{ display: "flex", gap: 8, margin: "12px 0 6px" }}><input type="checkbox" checked={useH} onChange={(e) => setUseH(e.target.checked)} /> Tenir compte de l&apos;humidité (air humide)</label>
        {useH && <NumField id="h" label="Humidité relative" unit="%" value={f.h} onChange={set("h")} />}
        <h2 style={{ marginTop: 16 }}>Pesées</h2>
        <div className="field" style={{ maxWidth: 200 }}><label htmlFor="nb">Nombre de mesures</label>
          <select id="nb" className="input" value={nb} onChange={(e) => setNb(Number(e.target.value))}>{range(19).map((i) => <option key={i + 2} value={i + 2}>{i + 2}</option>)}</select></div>
        <div className="grid cols-3" style={{ marginTop: 10 }}>
          {range(nb).map((i) => (<NumField key={i} id={`m${i}`} label={`Masse ${i + 1}`} unit="g" value={masses[i]} onChange={(v) => setMasses((m) => m.map((x, j) => (j === i ? v : x)))} />))}
        </div>
      </div>
      <div className="card">
        <h2>Résultat</h2>
        {!r ? <div className="empty">Saisissez au moins 2 masses et les conditions pour lancer le calcul.</div> : (
          <>
            <div style={{ marginBottom: 10 }}><VerdictBadge verdict={r.conforme ? "ok" : "no"} /></div>
            <Row strong label="Volume à 20 °C" value={`${fmt(r.V20, 4)} mL`} />
            <Row label="Incertitude élargie U (k=2)" value={`± ${fmt(r.UV20 * 1000, 2)} µL`} />
            <Row label="Justesse (erreur)" value={`${r.errAbs >= 0 ? "+" : ""}${fmt(r.errAbs * 1000, 2)} µL (${r.errPct >= 0 ? "+" : ""}${fmt(r.errPct, 3)} %)`} />
            <Row label="Fidélité (CV)" value={`${fmt(r.cvPct, 3)} %`} />
            <Row label="EMT appliquée" value={`± ${fmt(input.emt, 2)} %`} />
            <Row label={`Masse moyenne (n=${r.n})`} value={`${fmt(r.mMoy, 5)} g`} />
            <Row label="Écart-type s" value={`${fmt(r.sM * 1000, 3)} mg`} />
            <Row label="ρ eau (Tanaka/CIPM)" value={`${fmt(r.rhoE, 6)} g/cm³`} />
            <Row label={`ρ air (${useH ? "air humide" : "air sec"})`} value={`${fmt(r.rhoA, 6)} g/cm³`} />
            <Row label="Facteur Z" value={`${fmt(r.Z, 6)} mL/g`} />
            <Row label="Facteur Y (dilatation)" value={fmt(r.Y, 7)} />
            <Row label="uc(V₂₀)" value={`${fmt(r.ucV20 * 1000, 3)} µL`} />
          </>
        )}
        <SaveBar instrumentId={instrumentId} kind="pipette" payload={input} disabled={!r} />
      </div>
    </div>
  );
}
