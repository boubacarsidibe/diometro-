"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

// Barre latérale. Sur téléphone (≤ 720 px), seul l'en-tête reste visible : le bouton Menu déplie la navigation,
// qui se replie d'elle-même dès qu'on change de page (l'ouverture est mémorisée pour la page courante uniquement).
export function Sidebar({ head, children, alertCount }: { head: React.ReactNode; children: React.ReactNode; alertCount: number }) {
  const path = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-head">
        {head}
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="sidebar-body" onClick={() => setOpenOn(open ? null : path)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
          {open ? "Fermer" : "Menu"}
          {!open && alertCount > 0 && <span className="badge alert" aria-label={`${alertCount} alerte(s)`}>{alertCount}</span>}
        </button>
      </div>
      <div id="sidebar-body" className="sidebar-body">{children}</div>
    </aside>
  );
}
