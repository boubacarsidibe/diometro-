import "./console.css";
import { daysUntil, stateOf } from "@/lib/console";
import { loadConsole } from "./admin/data";
import { ConsoleNav } from "@/components/console/ConsoleNav";
import { logout } from "../(auth)/actions";
import { ConsoleClock } from "@/components/console/ConsoleClock";

// Console du propriétaire de la plateforme (/admin) : mise en page et palette propres
// (60 % lait d'avoine, 30 % vert forêt, 10 % rouge tomate), distinctes de l'espace des clients.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { s, tenants, today } = await loadConsole();
  // Abonnements à traiter : échus ou finissant dans les 30 jours (entreprises non bloquées).
  const due = tenants.filter((t) => stateOf(t, today) !== "blocked" && t.plan_expires_at && daysUntil(t.plan_expires_at, today) <= 30).length;
  return (
    <div className="cs">
      <aside className="cs-side" aria-label="Console plateforme">
        <div className="cs-brand">
          <div className="cs-mark" aria-hidden="true">D</div>
          <div><b>DIOMETRO</b><small>Console plateforme</small></div>
        </div>
        <span className="cs-chip">Pilotage</span>
        <ConsoleNav due={due} />
        <ConsoleClock timeZone={s.timeZone} />
        <form action={logout} className="cs-out">
          <button className="cs-logout">Déconnexion<small>Fermer la console</small></button>
        </form>
      </aside>
      <main className="cs-main">{children}</main>
    </div>
  );
}
