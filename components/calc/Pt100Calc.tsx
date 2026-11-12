"use client";
import { useMemo, useState } from "react";
import { computePt100 } from "@/lib/calc/pt100";
import { fmt, parseNumber } from "@/lib/calc/parse";
import { NumField, Row, SaveBar, VerdictBadge, range } from "@/components/calc/ui";

const DEFAULT_T = ["20", "50", "80", "100", "25", "0", "60", "40", "75", "90"];

// Coefficients a, b, c vides : ils doivent venir du certificat de l'étalon de l'utilisateur, jamais d'un exemple.
// EMT reprise de la fiche de l'instrument (champ « Tolérance / EMT »).
export function Pt100Calc({ instrumentId, emt = "", organisme = "" }: { instrumentId: string; emt?: string; organisme?: string }) {
  const [f, setF] = useState({ a: "", b: "", c: "", emt, resLue: "0,01", resEt: "0,01", uEt: "0,05", uDerive: "0,05", uHomog: "0,10" });
  const [rig, setRig] = useState(true);
  const [nb, setNb] = useState(3);
  const [nrep, setNrep] = useState(5);
  const [cons, setCons] = useState<string[]>(DEFAULT_T);
  const [vref, setVref] = useState<string[][]>(() => range(10).map(() => Array(10).fill("")));
  const [vlue, setVlue] = useState<string[][]>(() => range(10).map(() => Array(10).fill("")));
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const upd = (setter: typeof setVref, i: number, j: number) => (v: string) => setter((m) => m.map((row, a) => (a === i ? row.map((x, b) => (b === j ? v : x)) : row)));

  const input = useMemo(() => ({
    a: parseNumber(f.a), b: parseNumber(f.b), c: parseNumber(f.c), emt: parseNumber(f.emt), resLue: parseNumber(f.resLue), resEt: parseNumber(f.resEt),
    uEt: parseNumber(f.uEt), uDerive: parseNumber(f.uDerive), uHomog: parseNumber(f.uHomog), modeRig: rig,
    points: range(nb).map((i) => ({
      cons: Number.isFinite(parseNumber(cons[i])) ? parseNumber(cons[i]) : null,
      vref: vref[i].slice(0, nrep).map(parseNumber).filter(Number.isFinite), vlue: vlue[i].slice(0, nrep).map(parseNumber).filter(Number.isFinite),
    })),
  }), [f, rig, nb, nrep, cons, vref, vlue]);
  const coefOk = [input.a, input.b, input.c, input.emt, input.resLue, input.resEt, input.uEt, input.uDerive, input.uHomog].every(Number.isFinite);
  const r = useMemo(() => (coefOk ? computePt100(input) : null), [coefOk, input]);
  const payload = { ...input, points: input.points.filter((p) => p.vref.length >= 2 && p.vlue.length >= 2) };

  return (
    <div className="stack">
      <div className="card">
        <h2>Étalon et incertitudes</h2>
        <p className="helper" style={{ marginBottom: 10 }}>Saisissez les coefficients a, b, c du dernier certificat d&apos;étalonnage{organisme ? ` ${organisme}` : ""} de <strong>votre</strong> étalon. L&apos;EMT est reprise de la fiche de l&apos;instrument (champ « Tolérance / EMT ») : vérifiez-la.</p>
        <div className="grid cols-3">
          <NumField id="a" label="Coeff. a" value={f.a} onChange={set("a")} />
          <NumField id="b" label="Coeff. b" value={f.b} onChange={set("b")} />
          <NumField id="c" label="Coeff. c" value={f.c} onChange={set("c")} />
          <NumField id="emt" label="EMT" unit="°C" value={f.emt} onChange={set("emt")} />
          <NumField id="resLue" label="Résolution sonde" unit="°C" value={f.resLue} onChange={set("resLue")} />
          <NumField id="resEt" label="Résolution étalon" unit="°C" value={f.resEt} onChange={set("resEt")} />
          <NumField id="uEt" label="U étalon (certificat, k=2)" unit="°C" value={f.uEt} onChange={set("uEt")} />
          <NumField id="uDerive" label="Dérive de l'étalon" unit="°C" value={f.uDerive} onChange={set("uDerive")} />
          <NumField id="uHomog" label="Homogénéité du bain" unit="°C" value={f.uHomog} onChange={set("uHomog")} />
        </div>
        <div className="grid cols-3" style={{ marginTop: 12 }}>
          <div className="field"><label htmlFor="nb">Nombre de points</label><select id="nb" className="input" value={nb} onChange={(e) => setNb(Number(e.target.value))}>{range(10).map((i) => <option key={i + 1}>{i + 1}</option>)}</select></div>
          <div className="field"><label htmlFor="nrep">Mesures par point</label><select id="nrep" className="input" value={nrep} onChange={(e) => setNrep(Number(e.target.value))}>{range(9).map((i) => <option key={i + 2}>{i + 2}</option>)}</select></div>
          <label style={{ display: "flex", gap: 8, alignItems: "end", paddingBottom: 10 }}><input type="checkbox" checked={rig} onChange={(e) => setRig(e.target.checked)} /> Mode rigoureux (erreur + U ≤ EMT). Décoché : rapide (erreur ≤ EMT)</label>
        </div>
      </div>

      {range(nb).map((i) => {
        const p = r?.points.find((x) => x.index === i);
        return (
          <div className="card" key={i}>
            <h2>Point {i + 1}</h2>
            <div className="grid cols-4">
              <NumField id={`cons${i}`} label="Consigne" unit="°C" value={cons[i]} onChange={(v) => setCons((c) => c.map((x, j) => (j === i ? v : x)))} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${nrep}, minmax(0, 1fr))`, marginTop: 8 }}>
              {range(nrep).map((j) => <NumField key={j} id={`vr${i}-${j}`} label={`Étalon m${j + 1}`} value={vref[i][j]} onChange={upd(setVref, i, j)} />)}
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${nrep}, minmax(0, 1fr))`, marginTop: 8 }}>
              {range(nrep).map((j) => <NumField key={j} id={`vl${i}-${j}`} label={`Sonde m${j + 1}`} value={vlue[i][j]} onChange={upd(setVlue, i, j)} />)}
            </div>
            {p && (
              <div style={{ marginTop: 12 }}>
                <Row label="Vref moyenne" value={`${fmt(p.VrefM, 2)} °C`} /><Row label="Vrc (étalon corrigé)" value={`${fmt(p.Vrc, 2)} °C`} />
                <Row label="Vlue moyenne" value={`${fmt(p.VlueM, 2)} °C`} /><Row label="Erreur |Vlue − Vrc|" value={`${fmt(p.erreur, 3)} °C`} />
                <Row label="U (k=2)" value={`± ${fmt(p.U, 3)} °C`} />
                <div style={{ marginTop: 8 }}><VerdictBadge verdict={p.verdict} /></div>
              </div>
            )}
          </div>
        );
      })}

      <div className="card">
        <h2>Verdict global</h2>
        {!r ? <div className="empty">Saisissez au moins un point complet (2 mesures minimum, étalon et sonde).</div> : (
          <>
            <VerdictBadge verdict={r.global} />
            <div style={{ marginTop: 10 }}>
              <Row label="Mode de verdict" value={rig ? "Rigoureux (erreur + U ≤ EMT)" : "Rapide (erreur ≤ EMT)"} />
              <Row label="EMT appliquée" value={`± ${fmt(input.emt, 2)} °C`} /><Row label="Points évalués" value={`${r.points.length} / ${nb}`} />
            </div>
          </>
        )}
        <SaveBar instrumentId={instrumentId} kind="pt100" payload={payload} disabled={!r} />
      </div>
    </div>
  );
}
