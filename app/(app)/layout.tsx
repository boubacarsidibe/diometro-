import { NavLink } from "@/components/NavLink";
import { Sidebar } from "@/components/Sidebar";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { ROLE_LABEL, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";
import { logout } from "../(auth)/actions";

/** Texte blanc ou quasi noir selon ce qui se lit le mieux sur la couleur donnée (contraste WCAG). */
function textOn(hex: string): string {
  const lin = (i: number) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5);
  return 1.05 / (l + 0.05) >= (l + 0.05) / (0.0056 + 0.05) ? "#ffffff" : "#111111";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("date_prochaine, statut").is("deleted_at", null);
  const rows = data ?? [];
  const alerts = rows.filter((r) => r.statut === "En service" && ["expire", "urgent", "bientot"].includes(urgencyOf(r.date_prochaine))).length;
  // Couleur validée côté base (regex) et ici avant injection dans le style.
  // L'ancien bleu par défaut (#1d4ed8, défaut de la colonne tenants.accent) est remplacé par l'accent de la palette ;
  // une couleur choisie par le client dans Paramètres est conservée.
  const DEFAULT_ACCENT = "#ff6b1a";
  const chosen = /^#[0-9a-fA-F]{6}$/.test(s.tenant.accent) ? s.tenant.accent : DEFAULT_ACCENT;
  const accent = chosen.toLowerCase() === "#1d4ed8" ? DEFAULT_ACCENT : chosen;
  const onAccent = textOn(accent);

  return (
    <div className="app" style={{ ["--c10" as string]: accent, ["--on-accent" as string]: onAccent }}>
      <Sidebar alertCount={alerts} head={
        <div className="logo-wrap">
          {s.tenant.logo_data ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logo-img" src={s.tenant.logo_data} alt={`Logo ${s.tenant.name}`} />
          ) : (
            <div className="logo-name">DIO<span>METRO</span></div>
          )}
          <div className="logo-sub">{s.tenant.name}</div>
        </div>}>
        <nav className="navgroup" aria-label="Navigation principale" style={{ overflowY: "auto" }}>
          <div className="navlabel">Navigation</div>
          <NavLink href="/dashboard">Tableau de bord</NavLink>
          <NavLink href="/instruments">Instruments</NavLink>
          <NavLink href="/planning">Planning</NavLink>
          {s.role !== "consultation" && <NavLink href="/etalonnage">Étalonnage</NavLink>}
          <NavLink href="/alerts" badge={alerts} alert>Alertes</NavLink>
          <NavLink href="/prestataires">Prestataires</NavLink>
          <NavLink href="/inventaire">Inventaire</NavLink>
          <NavLink href="/etiquettes">QR codes et étiquettes</NavLink>
          {(s.role !== "consultation" || s.isPlatformAdmin) && <div className="navlabel" style={{ marginTop: 10 }}>Administration</div>}
          {s.role !== "consultation" && <NavLink href="/users">Utilisateurs</NavLink>}
          {s.role === "admin" && <NavLink href="/corbeille">Corbeille</NavLink>}
          {s.role === "admin" && <NavLink href="/parametres">Paramètres</NavLink>}
          {s.role === "admin" && <NavLink href="/audit">Audit trail</NavLink>}
          {s.isPlatformAdmin && <NavLink href="/admin">Plateforme</NavLink>}
          <div className="navlabel" style={{ marginTop: 10 }}>Aide</div>
          <NavLink href="/aide">Aide et FAQ</NavLink>
        </nav>
        <div className="userbox">
          <div className="userline">{s.displayName}</div>
          <div className="userrole">{ROLE_LABEL[s.role]}</div>
          <form action={logout}><button className="btn small soft">Déconnexion</button></form>
          <NotificationOptIn alertCount={alerts} />
        </div>
      </Sidebar>
      <div className="main">
        {s.readOnly && (
          <div className="notice err" role="status" style={{ margin: 0, borderRadius: 0, padding: "10px 24px" }}>
            {s.plan === "essai" ? "Votre période d'essai est terminée" : "Votre abonnement a expiré"} : le compte est en <strong>lecture seule</strong>.
            Vos données sont conservées. {s.role === "admin" ? <>Choisissez une formule dans <a href="/parametres">Paramètres &gt; Abonnement</a> pour réactiver l&apos;écriture.</> : "Votre administrateur peut choisir une formule pour réactiver l'écriture."}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
