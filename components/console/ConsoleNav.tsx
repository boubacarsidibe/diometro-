"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Navigation de la console ; le lien actif suit l'adresse de la page.
export function ConsoleNav({ due }: { due: number }) {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "Vue d'ensemble", on: path === "/admin" || path.startsWith("/admin/entreprises") },
    { href: "/admin/abonnements", label: "Abonnements", on: path.startsWith("/admin/abonnements"), badge: due },
    { href: "/admin/facturation", label: "Facturation", on: path.startsWith("/admin/facturation") },
    { href: "/admin/journal", label: "Journal", on: path.startsWith("/admin/journal") },
  ];
  return (
    <nav className="cs-nav" aria-label="Navigation de la console">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={`cs-navbtn${l.on ? " active" : ""}`} aria-current={l.on ? "page" : undefined}>
          {l.label}{l.badge ? <span className="cs-badge" aria-label={`${l.badge} à traiter`}>{l.badge}</span> : null}
        </Link>
      ))}
      <Link href="/dashboard" className="cs-navbtn">Mon espace DIOMETRO</Link>
    </nav>
  );
}
