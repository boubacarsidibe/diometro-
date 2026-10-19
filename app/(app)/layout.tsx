import { NavLink } from "@/components/NavLink";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";
import { logout } from "../(auth)/actions";

const ROLE_LABEL = { admin: "Administrateur", responsable: "Responsable", consultation: "Consultation" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("date_prochaine, statut").is("deleted_at", null);
  const rows = data ?? [];
  const alerts = rows.filter((r) => r.statut === "En service" && ["expire", "urgent", "bientot"].includes(urgencyOf(r.date_prochaine))).length;
  // Couleur validée côté base (regex) et ici avant injection dans le style.
  const accent = /^#[0-9a-fA-F]{6}$/.test(s.tenant.accent) ? s.tenant.accent : "#1d4ed8";

  return (
    <div className="app" style={{ ["--accent" as string]: accent, ["--accent-soft" as string]: accent }}>
      <aside className="sidebar">
        <div className="logo-wrap">
          <div className="logo-name">DIO<span>METRO</span></div>
          <div className="logo-sub">{s.tenant.name}</div>
        </div>
        <nav className="navgroup" aria-label="Navigation principale">
          <div className="navlabel">Navigation</div>
          <NavLink href="/dashboard" badge={rows.length}>Tableau de bord</NavLink>
          <NavLink href="/instruments">Instruments</NavLink>
          <NavLink href="/alerts" badge={alerts} alert>Alertes</NavLink>
          {s.role === "admin" && <NavLink href="/users">Utilisateurs</NavLink>}
          {s.role === "admin" && <NavLink href="/audit">Audit trail</NavLink>}
        </nav>
        <div className="userbox">
          <div className="userline">{s.displayName}</div>
          <div className="userrole">{ROLE_LABEL[s.role]}</div>
          <form action={logout}><button className="btn small soft">Déconnexion</button></form>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
