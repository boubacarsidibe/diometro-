"use client";
import { useState, type KeyboardEvent } from "react";

const MAX = 50;
const MAX_LEN = 100;
const key = (s: string) => s.trim().toLocaleLowerCase("fr");

/**
 * Liste des bâtiments, un par ligne : ajouter, renommer, retirer.
 * Le formulaire reçoit un champ caché <name> avec un bâtiment par ligne (chaque nom suivi d'un retour à la ligne, pour qu'une virgule dans un nom
 * ne le coupe pas ; le serveur accepte aussi les virgules de l'ancien format sur une seule ligne). `usage` : nombre d'instruments par bâtiment, pour prévenir avant d'en retirer un.
 */
export function BuildingsEditor({ id, name, initial, usage = {} }: { id: string; name: string; initial: string[]; usage?: Record<string, number> }) {
  const [items, setItems] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const removedInUse = initial.filter((b) => (usage[b] ?? 0) > 0 && !items.some((i) => key(i) === key(b)));

  const add = () => {
    const v = draft.trim().slice(0, MAX_LEN);
    if (!v) return;
    if (items.some((i) => key(i) === key(v))) { setMsg(`« ${v} » est déjà dans la liste.`); return; }
    if (items.length >= MAX) { setMsg(`${MAX} bâtiments maximum.`); return; }
    setItems([...items, v]);
    setDraft("");
    setMsg(null);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(); } // Entrée ajoute le bâtiment au lieu d'envoyer le formulaire
  };

  return (
    <div className="bld">
      {/* Le nom tapé mais pas encore ajouté est enregistré aussi : rien n'est perdu si l'on clique directement sur Enregistrer. */}
      <input type="hidden" name={name} value={[...items, draft].map((i) => i.trim()).filter(Boolean).map((i) => `${i}\n`).join("")} />
      {items.length === 0 ? (
        <p className="helper">Aucun bâtiment pour l&apos;instant.</p>
      ) : (
        <ul className="bld-list">
          {items.map((b, n) => (
            <li key={n}>
              <span className="bld-num" aria-hidden="true">{n + 1}</span>
              <input
                className="input" value={b} maxLength={MAX_LEN} aria-label={`Bâtiment ${n + 1}`}
                onChange={(e) => setItems(items.map((x, k) => (k === n ? e.target.value : x)))}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              />
              <span className="helper bld-use">{(usage[b] ?? 0) > 0 ? `${usage[b]} instrument${usage[b] > 1 ? "s" : ""}` : ""}</span>
              <button type="button" className="btn small soft" onClick={() => { setItems(items.filter((_, k) => k !== n)); setMsg(null); }} aria-label={`Retirer ${b || `le bâtiment ${n + 1}`}`}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
      <div className="bld-add">
        <input id={id} className="input" value={draft} maxLength={MAX_LEN} placeholder="Nom du bâtiment (ex. : Atelier A)" onChange={(e) => { setDraft(e.target.value); setMsg(null); }} onKeyDown={onKey} />
        <button type="button" className="btn small soft" onClick={add} disabled={!draft.trim()}>+ Ajouter</button>
      </div>
      {msg && <span className="field-error" role="alert">{msg}</span>}
      {removedInUse.length > 0 && (
        <p className="helper bld-warn" role="note">
          {removedInUse.map((b) => `« ${b} » (${usage[b]} instrument${usage[b] > 1 ? "s" : ""})`).join(", ")} : ces instruments gardent ce nom de bâtiment ; il ne sera simplement plus proposé dans la liste.
        </p>
      )}
    </div>
  );
}
