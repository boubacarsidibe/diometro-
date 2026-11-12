import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Echeancier } from "@/components/Echeancier";
import { Icon, type IconName } from "@/components/Icon";
import { LEGAL } from "@/lib/legal";
import { money } from "@/lib/money";
import { OFFERS, TRIAL_DAYS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "DIOMETRO · Suivi métrologique des instruments de mesure",
  description: "Suivez vos instruments de mesure, vos étalonnages et vos échéances. Alertes, calculateurs de conformité, QR codes, planning, inventaire. Essai gratuit de 30 jours.",
};

const FEATURES: { icon: IconName; t: string; d: string }[] = [
  { icon: "bell", t: "Échéances et alertes", d: "Chaque instrument a sa prochaine échéance, calculée automatiquement. Alertes à l'écran et par email avant l'expiration." },
  { icon: "file", t: "Fiches de vie", d: "Historique complet des étalonnages et interventions, avec certificats, procédures et photos joints." },
  { icon: "calc", t: "Calculateurs de conformité", d: "Pipettes (ISO 8655), thermomètres Pt100 avec incertitude GUM, comparaison directe : le résultat alimente la fiche." },
  { icon: "qr", t: "QR codes et étiquettes", d: "Un QR code par instrument : un scan ouvre sa fiche à jour, sans connexion. Impression d'étiquettes en un clic." },
  { icon: "cal", t: "Planning et inventaire", d: "Calendrier mensuel, charge de travail sur 12 mois, inventaire physique avec historique des manquants." },
  { icon: "build", t: "Prestataires", d: "Carnet de laboratoires, accréditations, délais, tarifs en FCFA et comparateur par domaine de mesure." },
  { icon: "download", t: "Exports et audit", d: "Excel et PDF en un clic. Journal d'audit non modifiable : qui a fait quoi, et quand." },
  { icon: "shield", t: "Sécurité", d: "Double authentification obligatoire, données de chaque entreprise totalement isolées, rôles administrateur / coordinateur / consultation." },
];

const STEPS = [
  { t: "Créez votre espace", d: "Inscription en 2 minutes, essai gratuit de 30 jours, sans carte bancaire." },
  { t: "Ajoutez vos instruments", d: "Saisissez-les avec leurs documents et photos (depuis une tablette si besoin) et leur fréquence d'étalonnage." },
  { t: "Laissez DIOMETRO vous prévenir", d: "Échéances, alertes, calculs de conformité et étiquettes QR : tout est prêt." },
];

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    if (typeof e === "object" && e && "digest" in e) throw e; // redirection Next.js
    // Supabase indisponible : la page d'accueil reste affichée.
  }
  const contact = LEGAL.email;
  return (
    <>
      <section className="h-hero">
        <h1>Le suivi métrologique de vos instruments, sans tableur.</h1>
        <p className="h-lead">DIOMETRO centralise vos instruments de mesure, leurs étalonnages et leurs échéances. Vous êtes alerté avant qu&apos;un instrument ne soit hors délai, et vos preuves de conformité sont toujours à portée de scan.</p>
        <div className="h-cta">
          <Link href="/register" className="h-btn primary">Démarrer l&apos;essai gratuit de {TRIAL_DAYS} jours</Link>
          <Link href="/login" className="h-btn light">Se connecter</Link>
        </div>
        <p className="h-fine">Sans carte bancaire. Toutes les fonctionnalités pendant l&apos;essai, jusqu&apos;à 50 instruments.</p>
        <div className="h-ech">
          <div className="h-ech-cap"><span>Exemple : un parc de 31 instruments, du retard aux 90 prochains jours</span><span>Trait blanc : aujourd&apos;hui</span></div>
          <Echeancier />
        </div>
      </section>

      <section id="fonctionnalites" className="h-section">
        <div className="h-wrap">
          <h2>Tout ce qu&apos;il faut pour tenir vos instruments à jour</h2>
          <div className="h-feats">
            {FEATURES.map((f) => (
              <div className="h-feat" key={f.t}>
                <Icon name={f.icon} />
                <div><h3>{f.t}</h3><p>{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="h-section h-band">
        <div className="h-wrap">
          <h2>Comment ça marche</h2>
          <ol className="h-steps">
            {STEPS.map((s) => (<li className="h-step" key={s.t}><h3>{s.t}</h3><p>{s.d}</p></li>))}
          </ol>
        </div>
      </section>

      <section id="formules" className="h-section">
        <div className="h-wrap">
          <h2>Formules</h2>
          <p className="h-sub">Toutes les formules incluent l&apos;ensemble des fonctionnalités ; seule la capacité d&apos;instruments change.</p>
          <p className="h-note"><strong>Essai gratuit de {TRIAL_DAYS} jours, jusqu&apos;à 50 instruments</strong>, avec toutes les fonctionnalités, puis choix d&apos;une formule. Il n&apos;y a pas de formule gratuite : à la fin des {TRIAL_DAYS} jours, le compte passe en <strong>lecture seule</strong> jusqu&apos;au paiement. <strong>Vos données ne sont jamais supprimées.</strong></p>
          <div className="h-plans">
            {OFFERS.map((o) => (
              <div className="h-plan" key={o.id}>
                <h3>{o.nom}</h3>
                <p className="h-plan-target">{o.cible}</p>
                <div>
                  <div className="h-plan-cap">{o.instruments ? `Jusqu'à ${o.instruments.toLocaleString("fr-FR")} instruments` : "Plus de 2 000 instruments"}</div>
                  {o.prix
                    ? <div className="h-plan-price"><strong>{money(o.prix.mensuel, "XOF")}</strong> / mois, ou {money(o.prix.annuel, "XOF")} / an</div>
                    : <div className="h-plan-price">Tarif communiqué prochainement</div>}
                </div>
                {o.id === "custom" && contact
                  ? <a className="h-btn outline" href={`mailto:${contact}?subject=Devis DIOMETRO sur-mesure`}>Demander un devis</a>
                  : <Link className={`h-btn ${o.id === "custom" ? "outline" : "primary"}`} href={`/register?formule=${o.id}`}>{o.id === "custom" ? "Demander un devis" : `Essayer avec ${o.nom}`}</Link>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
