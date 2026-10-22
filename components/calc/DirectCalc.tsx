"use client";
import { useMemo, useState } from "react";
import { computeDirect } from "@/lib/calc/direct";
import { fmt, parseNumber } from "@/lib/calc/parse";
import { NumField, Row, SaveBar, VerdictBadge, range } from "@/components/calc/ui";

export function DirectCalc({ instrumentId }: { instrumentId: string }) {
  const [emt, setEmt] = useState("");
  const [nb, setNb] = useState(3);
  const [ref, setRef] = useState<string[]>(Array(20).fill(""));
  const [lue, setLue] = useState<string[]>(Array(20).fill(""));
  const input = useMemo(() => ({ emt: parseNumber(emt), points: range(nb).map((i) => ({ ref: parseNumber(ref[i]), lue: parseNumber(lue[i]) })).filter((p) => Number.isFinite(p.ref) && Number.isFinite(p.lue)) }), [emt, nb, ref, lue]);
  const r = useMemo(() => computeDirect(input), [input]);
  return (
    <div className="grid cols-2" style={{ alignItems: "start" }}>
      <div className="card">
        <h2>Points de vérification</h2>
        <div className="grid cols-2">
          <NumField id="emt" label="EMT (tolérance)" value={emt} onChange={setEmt} />
          <div className="field"><label htmlFor="nb">Nombre de points</label><select id="nb" className="input" value={nb} onChange={(e) => setNb(Number(e.target.value))}>{range(20).map((i) => <option key={i + 1}>{i + 1}</option>)}</select></div>
        </div>
        <p className="helper" style={{ margin: "10px 0" }}>Pour chaque point : la valeur de l&apos;étalon de référence, puis la valeur lue sur l&apos;instrument.</p>
        {range(nb).map((i) => (
          <div className="grid cols-2" key={i} style={{ marginBottom: 8 }}>
            <NumField id={`ref${i}`} label={`Point ${i + 1} — étalon`} value={ref[i]} onChange={(v) => setRef((a) => a.map((x, j) => (j === i ? v : x)))} />
            <NumField id={`lue${i}`} label={`Point ${i + 1} — lue`} value={lue[i]} onChange={(v) => setLue((a) => a.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Résultat</h2>
        {!r ? <div className="empty">Saisissez l&apos;EMT et au moins un point complet pour lancer le calcul.</div> : (
          <>
            <VerdictBadge verdict={r.global} />
            <div style={{ marginTop: 10 }}>
              <Row label="EMT appliquée" value={`± ${fmt(input.emt, 3)}`} /><Row label="Points évalués" value={`${r.points.length} / ${nb}`} />
              {r.points.map((p) => (
                <Row key={p.index} label={`Point ${p.index + 1} : étalon ${fmt(p.ref)} / lue ${fmt(p.lue)}`} value={`${p.erreur >= 0 ? "+" : ""}${fmt(p.erreur)}  ${p.verdict === "ok" ? "✓" : "✗"}`} />
              ))}
            </div>
          </>
        )}
        <SaveBar instrumentId={instrumentId} kind="direct" payload={input} disabled={!r} />
      </div>
    </div>
  );
}
