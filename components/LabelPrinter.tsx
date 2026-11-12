"use client";
import { useMemo, useState } from "react";

export type LabelItem = { id: string; ref: string; designation: string; location: string; building: string; qr: string | null };

// Une couleur par bâtiment (repère visuel sur le terrain), imprimée en bandeau sur l'étiquette.
const COLORS = ["#1d4ed8", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#be185d", "#4d7c0f"];
const NONE = "Sans bâtiment";

// Tous les QR codes ouvrent la page publique de l'instrument (sans connexion, toujours à jour).
export function LabelPrinter({ items }: { items: LabelItem[] }) {
  const printable = items.filter((i) => i.qr);
  const buildings = useMemo(() => [...new Set(items.map((i) => i.building || NONE))].sort((a, b) => a.localeCompare(b, "fr")), [items]);
  const color = (b: string) => (b === NONE ? "#64748b" : COLORS[buildings.indexOf(b) % COLORS.length]);
  const [filter, setFilter] = useState<string>("");
  const visible = items.filter((i) => !filter || (i.building || NONE) === filter);
  const [selected, setSelected] = useState<Set<string>>(new Set(printable.map((i) => i.id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = printable.filter((i) => selected.has(i.id) && (!filter || (i.building || NONE) === filter));
  return (
    <>
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <h2>Choisir les instruments</h2>
        <div className="label-filters" role="group" aria-label="Filtrer par bâtiment">
          <button type="button" className={`chip-btn${filter === "" ? " on" : ""}`} onClick={() => setFilter("")}>Tous ({items.length})</button>
          {buildings.map((b) => (
            <button key={b} type="button" className={`chip-btn${filter === b ? " on" : ""}`} style={{ ["--c" as string]: color(b) }} onClick={() => setFilter(b)}>
              <i aria-hidden="true" />{b} ({items.filter((i) => (i.building || NONE) === b).length})
            </button>
          ))}
        </div>
        <div className="form-actions" style={{ marginTop: 0, marginBottom: 12 }}>
          <button type="button" className="btn small soft" onClick={() => setSelected(new Set(printable.map((i) => i.id)))}>Tout sélectionner</button>
          <button type="button" className="btn small soft" onClick={() => setSelected(new Set())}>Tout désélectionner</button>
          <button type="button" className="btn small primary" onClick={() => window.print()} disabled={chosen.length === 0}>Imprimer {chosen.length} étiquette{chosen.length > 1 ? "s" : ""}</button>
        </div>
        <div className="grid cols-3">
          {visible.map((i) => (
            <label key={i.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, opacity: i.qr ? 1 : 0.6 }}>
              <input type="checkbox" checked={Boolean(i.qr) && selected.has(i.id)} disabled={!i.qr} onChange={() => toggle(i.id)} />
              <strong>{i.ref}</strong> <span className="helper">{i.designation}{!i.qr ? " — QR révoqué (à réactiver sur la fiche)" : ""}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="labels">
        {chosen.map((i) => (
          <div key={i.id} className="label-card" style={{ borderTop: `6px solid ${color(i.building || NONE)}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.qr!} alt={`QR code ${i.ref}`} width={96} height={96} />
            <div>
              <div className="l-bld" style={{ color: color(i.building || NONE) }}>{i.building || NONE}</div>
              <div className="l-ref">{i.ref}</div><div className="l-sub">{i.designation}</div><div className="l-sub">{i.location}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
