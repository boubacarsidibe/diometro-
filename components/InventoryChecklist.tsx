"use client";
import { useState, useTransition } from "react";
import { setFound } from "@/app/(app)/inventaire/actions";

export type CheckRow = { instrument_id: string; found: boolean; ref: string; designation: string; location: string };

export function InventoryChecklist({ runId, rows, canEdit }: { runId: string; rows: CheckRow[]; canEdit: boolean }) {
  const [state, setState] = useState(() => new Map(rows.map((r) => [r.instrument_id, r.found])));
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const found = [...state.values()].filter(Boolean).length;
  const pct = rows.length ? Math.round((found / rows.length) * 100) : 0;

  function toggle(id: string, value: boolean) {
    setError(undefined);
    setState((s) => new Map(s).set(id, value));
    start(async () => {
      const res = await setFound(runId, id, value);
      if (!res.ok) { setState((s) => new Map(s).set(id, !value)); setError("Enregistrement impossible, réessayez."); }
    });
  }
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><strong>{found} / {rows.length} retrouvés</strong><span>{pct} %</span></div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct}%` }} /></div>
      {error && <div className="notice err" role="alert" style={{ marginTop: 10 }}>{error}</div>}
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead><tr><th style={{ width: 70 }}>Présent</th><th>Référence</th><th>Désignation</th><th>Localisation</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.instrument_id}>
              <td><input type="checkbox" checked={state.get(r.instrument_id) ?? false} disabled={!canEdit || pending} onChange={(e) => toggle(r.instrument_id, e.target.checked)} aria-label={`Instrument ${r.ref} retrouvé`} /></td>
              <td><strong>{r.ref}</strong></td><td>{r.designation}</td><td>{r.location || "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
