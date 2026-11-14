"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Nombre de pages ouvertes dans l'application depuis le dernier chargement complet.
// Tant qu'il vaut 1 (page ouverte directement, lien d'e-mail, rechargement), « Retour » mène à la page parente
// au lieu de quitter le site par l'historique du navigateur.
let visited = 0;
let lastPath = "";

/** Page parente : /instruments/<id>/etalonnage → /instruments/<id> → /instruments → tableau de bord. */
export function parentOf(path: string, root = "/dashboard"): string {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  return parts.length > 1 ? `/${parts.slice(0, -1).join("/")}` : root;
}

export function BackButton({ fallback, label = "Retour", hideOn = ["/dashboard"] }: { fallback?: string; label?: string; hideOn?: string[] }) {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (path !== lastPath) { visited++; lastPath = path; }
  }, [path]);

  if (hideOn.includes(path)) return null;
  const target = fallback ?? parentOf(path);

  return (
    <a
      href={target}
      className="btn small soft back-btn"
      aria-label={`${label} à la page précédente`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // ouverture dans un nouvel onglet : lien normal
        e.preventDefault();
        if (visited > 1 && window.history.length > 1) router.back();
        else router.push(target);
      }}
    >
      <span aria-hidden="true">←</span> {label}
    </a>
  );
}
