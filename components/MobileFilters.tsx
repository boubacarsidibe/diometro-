"use client";
import { useState, type ReactNode } from "react";

// Sur téléphone, les filtres sont repliés derrière un bouton « Filtres (n) » pour laisser la place à la liste.
// Sur ordinateur et tablette, ils restent affichés comme avant (le conteneur est transparent pour la mise en page).
export function MobileFilters({ count = 0, children }: { count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn soft mf-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="mf-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filtres{count > 0 && <span className="mf-count">{count}</span>}
        </span>
        <span aria-hidden="true" className="mf-chevron">{open ? "▲" : "▼"}</span>
      </button>
      <div className="mf-body" data-open={open ? "" : undefined}>{children}</div>
    </>
  );
}
