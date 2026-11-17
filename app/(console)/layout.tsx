import "./console.css";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/session";
import { logout } from "../(auth)/actions";
import { ConsoleClock } from "@/components/console/ConsoleClock";

// Console du propriétaire de la plateforme (/admin) : mise en page et palette propres
// (60 % lait d'avoine, 30 % vert forêt, 10 % rouge tomate), distinctes de l'espace des clients.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePlatformAdmin();
  return (
    <div className="cs">
      <aside className="cs-side" aria-label="Console plateforme">
        <div className="cs-brand">
          <div className="cs-mark" aria-hidden="true">D</div>
          <div><b>DIOMETRO</b><small>Console plateforme</small></div>
        </div>
        <span className="cs-chip">Pilotage</span>
        <nav className="cs-nav" aria-label="Navigation de la console">
          <Link href="/admin" className="cs-navbtn active" aria-current="page">Vue d&apos;ensemble</Link>
          <Link href="/dashboard" className="cs-navbtn">Mon espace DIOMETRO</Link>
        </nav>
        <ConsoleClock timeZone={s.timeZone} />
        <form action={logout} className="cs-out">
          <button className="cs-logout">Déconnexion<small>Fermer la console</small></button>
        </form>
      </aside>
      <main className="cs-main">{children}</main>
    </div>
  );
}
