"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type FilterSelect = { key: string; label: string; options: { value: string; label: string }[] };

// Sans accents ni majuscules : « Etalonnage » trouve « Étalonnage ».
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Recherche instantanée sur les lignes des tableaux contenus (tbody > tr), sans recharger la page.
 * - Le texte cherché doit apparaître dans la ligne (tous les mots, dans n'importe quel ordre).
 * - Chaque menu filtre sur l'attribut data-f-<clé> des lignes (ex. data-f-type="Étalonnage").
 * - Les lignes marquées data-filter-ignore (titres de groupe) restent affichées.
 * Le contenu est affiché en entier tant que le JavaScript n'a pas chargé.
 */
export function Filterable({ children, placeholder, selects = [], unit = ["élément", "éléments"] }: {
  children: ReactNode; placeholder: string; selects?: FilterSelect[]; unit?: [string, string];
}) {
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const [q, setQ] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<{ visible: number; total: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const words = norm(q).split(/\s+/).filter(Boolean);
    let visible = 0, total = 0;
    el.querySelectorAll<HTMLTableRowElement>("tbody > tr").forEach((tr) => {
      if (tr.hasAttribute("data-filter-ignore")) return;
      total++;
      const text = norm(tr.textContent ?? "");
      const ok = words.every((w) => text.includes(w)) && Object.entries(values).every(([k, v]) => !v || tr.getAttribute(`data-f-${k}`) === v);
      tr.hidden = !ok;
      if (ok) visible++;
    });
    setShown({ visible, total });
  }, [q, values, children]);

  const active = q.trim() !== "" || Object.values(values).some(Boolean);
  return (
    <div ref={box}>
      <div className="filter-bar" role="search">
        <input id={`${id}-q`} className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={100} />
        {selects.map((s) => (
          <select key={s.key} className="input" value={values[s.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))} aria-label={s.label}>
            <option value="">{s.label}</option>
            {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {active && <button type="button" className="btn soft small" onClick={() => { setQ(""); setValues({}); }}>Réinitialiser</button>}
        {shown && active && <span className="helper" role="status">{shown.visible} {shown.visible > 1 ? unit[1] : unit[0]} sur {shown.total}</span>}
      </div>
      {children}
      {shown && active && shown.visible === 0 && <div className="empty">Aucun résultat pour cette recherche.</div>}
    </div>
  );
}
