"use client";
import { useMemo, useState } from "react";
import { buildingColors, NO_BUILDING } from "@/lib/labels";

export type LabelItem = { id: string; ref: string; designation: string; location: string; building: string; qr: string | null };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Tous les QR codes ouvrent la page publique de l'instrument (sans connexion, toujours à jour).
// initialIds : présélection (lien « Imprimer l'étiquette » depuis la fiche d'un instrument).
export function LabelPrinter({ items, initialIds }: { items: LabelItem[]; initialIds?: string[] }) {
  const printable = items.filter((i) => i.qr);
  const buildings = useMemo(() => [...new Set(items.map((i) => i.building || NO_BUILDING))].sort((a, b) => a.localeCompare(b, "fr")), [items]);
  const color = useMemo(() => buildingColors(items.map((i) => i.building)), [items]);
  const [filter, setFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [perRow, setPerRow] = useState(3);
  const words = norm(q).split(/\s+/).filter(Boolean);
  const matches = (i: LabelItem) => (!filter || (i.building || NO_BUILDING) === filter) && words.every((w) => norm(`${i.ref} ${i.designation} ${i.location}`).includes(w));
  const visible = items.filter(matches);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds?.length ? initialIds : printable.map((i) => i.id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = printable.filter((i) => selected.has(i.id) && matches(i));
  const plural = chosen.length > 1 ? "s" : "";
  return (
    <>
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <h2>Choisir les instruments</h2>
        <div className="filter-bar">
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (référence, désignation, lieu…)" aria-label="Rechercher un instrument" maxLength={100} />
          {q && <button type="button" className="btn soft small" onClick={() => setQ("")}>Effacer</button>}
          <span className="helper">{visible.length} instrument{visible.length > 1 ? "s" : ""} affiché{visible.length > 1 ? "s" : ""}</span>
        </div>
        <div className="label-filters" role="group" aria-label="Filtrer par bâtiment">
          <button type="button" className={`chip-btn${filter === "" ? " on" : ""}`} onClick={() => setFilter("")}>Tous ({items.length})</button>
          {buildings.map((b) => (
            <button key={b} type="button" className={`chip-btn${filter === b ? " on" : ""}`} style={{ ["--c" as string]: color(b) }} onClick={() => setFilter(b)}>
              <i aria-hidden="true" />{b} ({items.filter((i) => (i.building || NO_BUILDING) === b).length})
            </button>
          ))}
        </div>
        <div className="form-actions" style={{ marginTop: 0, marginBottom: 12 }}>
          <button type="button" className="btn small soft" onClick={() => setSelected(new Set(printable.filter(matches).map((i) => i.id)))}>Tout sélectionner</button>
          <button type="button" className="btn small soft" onClick={() => setSelected(new Set())}>Tout désélectionner</button>
          <button type="button" className="btn small primary" onClick={() => window.print()} disabled={chosen.length === 0}>Imprimer {chosen.length} étiquette{plural}</button>
          <form method="post" action="/export/etiquettes.docx" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {chosen.map((i) => <input key={i.id} type="hidden" name="ids" value={i.id} />)}
            <label className="helper" htmlFor="par_rangee">Par rangée</label>
            <select id="par_rangee" name="par_rangee" className="input" style={{ width: 70 }} value={perRow} onChange={(e) => setPerRow(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="btn small soft" disabled={chosen.length === 0}>Exporter en Word</button>
          </form>
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
          <div key={i.id} className="label-card" style={{ borderTop: `6px solid ${color(i.building || NO_BUILDING)}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.qr!} alt={`QR code ${i.ref}`} width={96} height={96} />
            <div>
              <div className="l-bld" style={{ color: color(i.building || NO_BUILDING) }}>{i.building || NO_BUILDING}</div>
              <div className="l-ref">{i.ref}</div><div className="l-sub">{i.designation}</div><div className="l-sub">{i.location}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
