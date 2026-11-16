import { NavLink } from "@/components/NavLink";
import { Sidebar } from "@/components/Sidebar";
import { NotificationOptIn } from "@/components/NotificationOptIn";
import { ROLE_LABEL, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";
import { logout } from "../(auth)/actions";
import { LiveClock } from "@/components/LiveClock";
import { countryByCode, countryOfZone } from "@/lib/timezones";

// Lieu affiché à côté de l'heure : pays (et ville s'il a plusieurs fuseaux), ex. « Sénégal », « Canada (Toronto) ».
function placeOf(tz: string, country: string | null): string {
  const c = countryByCode(country) ?? countryOfZone(tz);
  if (!c) return tz.split("/").pop()!.replace(/_/g, " ");
  const z = c.zones.length > 1 ? c.zones.find((x) => x.id === tz) : undefined;
  return z ? `${c.name} (${z.city})` : c.name;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Session et compteur d'alertes en parallèle : la RLS limite déjà les instruments à l'entreprise de l'utilisateur.
  const supabase = await createClient();
  const [s, { data }] = await Promise.all([
    requireSession(),
    supabase.from("instruments").select("date_prochaine, statut").is("deleted_at", null),
  ]);
  const rows = data ?? [];
  const alerts = rows.filter((r) => r.statut === "En service" && ["expire", "urgent", "bientot"].includes(urgencyOf(r.date_prochaine))).length;
  // Même palette pour tous les clients (sauge / bordeaux / orange, app/globals.css) : plus de couleur propre à chaque entreprise.
  return (
    <div className="app">
      <Sidebar alertCount={alerts} head={
        <div className="logo-wrap">
          {s.tenant.logo_data ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="logo-img" src={s.tenant.logo_data} alt={`Logo ${s.tenant.name}`} />
          ) : (
            <div className="logo-name">DIO<span>METRO</span></div>
          )}
          <div className="logo-sub">{s.tenant.name}</div>
          <LiveClock timeZone={s.timeZone} place={placeOf(s.timeZone, s.country)} />
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
          <NavLink href="/compte">Mon compte</NavLink>
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
