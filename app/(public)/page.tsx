import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LEGAL } from "@/lib/legal";
import { money } from "@/lib/money";
import { OFFERS, TRIAL_DAYS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "DIOMETRO · Suivi métrologique des instruments de mesure",
  description: "Suivez vos instruments de mesure, vos étalonnages et vos échéances. Alertes, calculateurs de conformité, QR codes, planning, inventaire. Essai gratuit de 30 jours.",
};

const FEATURES = [
  { t: "Échéances et alertes", d: "Chaque instrument a sa prochaine échéance, calculée automatiquement. Alertes à l'écran et par email avant l'expiration." },
  { t: "Fiches de vie", d: "Historique complet des étalonnages et interventions, avec certificats, procédures et photos joints." },
  { t: "Calculateurs de conformité", d: "Pipettes (ISO 8655), thermomètres Pt100 avec incertitude GUM, comparaison directe : le résultat alimente la fiche." },
  { t: "QR codes et étiquettes", d: "Un QR code par instrument : un scan ouvre sa fiche à jour, sans connexion. Impression d'étiquettes en un clic." },
  { t: "Planning et inventaire", d: "Calendrier mensuel, charge de travail sur 12 mois, inventaire physique avec historique des manquants." },
  { t: "Prestataires", d: "Carnet de laboratoires, accréditations, délais, tarifs en FCFA et comparateur par domaine de mesure." },
  { t: "Exports et audit", d: "Excel et PDF en un clic. Journal d'audit non modifiable : qui a fait quoi, et quand." },
  { t: "Sécurité", d: "Double authentification obligatoire, données de chaque entreprise totalement isolées, rôles administrateur / coordinateur / consultation." },
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
      <section className="hero-site">
        <h1>Le suivi métrologique de vos instruments, sans tableur.</h1>
        <p>DIOMETRO centralise vos instruments de mesure, leurs étalonnages et leurs échéances. Vous êtes alerté avant qu&apos;un instrument ne soit hors délai, et vos preuves de conformité sont toujours à portée de scan.</p>
        <div className="hero-cta">
          <Link href="/register" className="btn primary">Démarrer l&apos;essai gratuit de {TRIAL_DAYS} jours</Link>
          <Link href="/login" className="btn soft">Se connecter</Link>
        </div>
        <p className="helper">Sans carte bancaire. Toutes les fonctionnalités pendant l&apos;essai.</p>
      </section>

      <section id="fonctionnalites" className="section">
        <h2>Tout ce qu&apos;il faut pour tenir vos instruments à jour</h2>
        <div className="grid cols-4 features">
          {FEATURES.map((f) => (<div className="card" key={f.t}><h3>{f.t}</h3><p>{f.d}</p></div>))}
        </div>
      </section>

      <section className="section alt">
        <h2>Comment ça marche</h2>
        <div className="grid cols-3">
          {STEPS.map((s, i) => (<div className="card" key={s.t}><div className="step">{i + 1}</div><h3>{s.t}</h3><p>{s.d}</p></div>))}
        </div>
      </section>

      <section id="formules" className="section">
        <h2>Formules</h2>
        <p className="section-lead">Toutes les formules incluent l&apos;ensemble des fonctionnalités ; seule la capacité d&apos;instruments change.</p>
        <div className="notice ok" style={{ maxWidth: 820, margin: "0 auto 20px" }}>
          <strong>Essai gratuit de {TRIAL_DAYS} jours</strong>, puis choix d&apos;une formule. Il n&apos;y a pas de formule gratuite : à la fin des {TRIAL_DAYS} jours, le compte passe en <strong>lecture seule</strong> jusqu&apos;au paiement. <strong>Vos données ne sont jamais supprimées.</strong>
        </div>
        <div className="grid cols-3 offers">
          {OFFERS.map((o) => (
            <div className="card offer" key={o.id}>
              <h3>{o.nom}</h3>
              <p className="cible">{o.cible}</p>
              <div className="cap">{o.instruments ? `Jusqu'à ${o.instruments.toLocaleString("fr-FR")} instruments` : "Plus de 2 000 instruments"}</div>
              {o.prix ? (
                <div className="prix"><strong>{money(o.prix.mensuel, "XOF")}</strong> / mois<br /><span className="helper">ou {money(o.prix.annuel, "XOF")} / an</span></div>
              ) : (
                <div className="prix muted">Tarif communiqué prochainement</div>
              )}
              {o.id === "custom" && contact
                ? <a className="btn soft" href={`mailto:${contact}?subject=Devis DIOMETRO sur-mesure`}>Demander un devis</a>
                : <Link className="btn primary" href={`/register?formule=${o.id}`}>{o.id === "custom" ? "Demander un devis" : `Essayer avec ${o.nom}`}</Link>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
