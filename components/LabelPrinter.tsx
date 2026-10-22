"use client";
import { useState } from "react";

export type LabelItem = { id: string; ref: string; designation: string; location: string; qr: string; qrPublic: string | null };

export function LabelPrinter({ items }: { items: LabelItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [mode, setMode] = useState<"app" | "public">("app");
  const chosen = items.filter((i) => selected.has(i.id) && (mode === "app" || i.qrPublic));
  return (
    <>
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <h2>Choisir les instruments</h2>
        <div className="field" style={{ maxWidth: 420, marginBottom: 12 }}>
          <label htmlFor="mode">Contenu du QR code</label>
          <select id="mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as "app" | "public")}>
            <option value="app">Fiche dans l&apos;application (connexion requise)</option>
            <option value="public">Lien public en lecture seule (instruments avec lien activé)</option>
          </select>
        </div>
        <div className="form-actions" style={{ marginTop: 0, marginBottom: 12 }}>
          <button type="button" className="btn small soft" onClick={() => setSelected(new Set(items.map((i) => i.id)))}>Tout sélectionner</button>
          <button type="button" className="btn small soft" onClick={() => setSelected(new Set())}>Tout désélectionner</button>
          <button type="button" className="btn small primary" onClick={() => window.print()} disabled={chosen.length === 0}>Imprimer {chosen.length} étiquette{chosen.length > 1 ? "s" : ""}</button>
        </div>
        <div className="grid cols-3">
          {items.map((i) => (
            <label key={i.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /> <strong>{i.ref}</strong> <span className="helper">{i.designation}{mode === "public" && !i.qrPublic ? " (lien public inactif)" : ""}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="labels">
        {chosen.map((i) => (
          <div key={i.id} className="label-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mode === "public" && i.qrPublic ? i.qrPublic : i.qr} alt={`QR code ${i.ref}`} width={96} height={96} />
            <div><div className="l-ref">{i.ref}</div><div className="l-sub">{i.designation}</div><div className="l-sub">{i.location}</div></div>
          </div>
        ))}
      </div>
    </>
  );
}
