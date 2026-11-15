import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalcDemo, CopyText, EcheancierDemo, HeroStage, PlanPicker, RevealObserver, SecurityStack, Tilt, type VitrineOffer } from "@/components/vitrine/Interactive";
import { IconArrow, IconBell, IconBuilding, IconCalc, IconCalendar, IconCheck, IconDownload, IconFacebook, IconFile, IconInstagram, IconLinkedin, IconMail, IconPhone, IconPlus, IconQr, IconWhatsapp, QrPattern } from "@/components/vitrine/icons";
import { CONTACT, RESEAUX } from "@/lib/contact";
import { CATALOG } from "@/lib/calc/catalog";
import { LEGAL } from "@/lib/legal";
import { OFFERS, TRIAL_DAYS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "DIOMETRO · Suivi métrologique des instruments de mesure",
  description: "Suivez vos instruments de mesure, vos étalonnages et vos échéances. Alertes, calculateurs de conformité, QR codes, planning, inventaire. Essai gratuit de 30 jours.",
};

// Chiffres tirés des données réelles : ils se mettent à jour quand le catalogue ou les formules évoluent.
const NB_TYPES = CATALOG.length;
const NB_CALCULATEURS = new Set(CATALOG.map((c) => c.calculateur).filter(Boolean)).size;
const MAX_INSTRUMENTS = Math.max(...OFFERS.map((o) => o.instruments ?? 0));

const FAQ = [
  { q: "Que se passe-t-il à la fin de l'essai gratuit ?", a: "Le compte passe en lecture seule : vous consultez et exportez toujours vos données, mais vous ne pouvez plus les modifier. L'écriture est rétablie dès le paiement d'une formule. Vos données ne sont jamais supprimées." },
  { q: "Que comprend l'essai gratuit ?", a: `L'inscription prend environ 2 minutes et l'essai donne accès à toutes les fonctionnalités pendant ${TRIAL_DAYS} jours. Pendant l'essai, vous pouvez enregistrer jusqu'à 50 instruments ; les formules vont ensuite jusqu'à plus de 2 000.` },
  { q: "Puis-je reprendre mon fichier Excel existant ?", a: "Oui. DIOMETRO fournit un modèle à télécharger, contrôle chaque ligne avant l'import, importe les lignes valides et vous remet un rapport des corrections à faire." },
  { q: "Le QR code fonctionne-t-il sans compte ?", a: "Oui. Un scan affiche la fiche à jour de l'instrument en lecture seule, limitée aux données utiles au terrain. Vous pouvez révoquer le lien d'un instrument à tout moment." },
  { q: "Quels calculs de conformité sont disponibles ?", a: `${NB_CALCULATEURS} calculateurs couvrent les vérifications les plus courantes, dont la comparaison directe à un étalon. Ils vous aident à décider et ne remplacent pas un certificat d'étalonnage accrédité. Le catalogue compte ${NB_TYPES} types d'instruments et s'enrichit en continu.` },
  { q: "Puis-je récupérer mes données si j'arrête ?", a: "Oui. Vos instruments, interventions et historiques s'exportent en Excel et en PDF à tout moment, y compris quand le compte est en lecture seule. Vos données restent à vous." },
  { q: "Mes données sont-elles visibles par d'autres entreprises ?", a: "Non. Chaque entreprise est isolée au niveau de la base de données, l'accès exige une double authentification, et chaque action est enregistrée dans un journal d'audit non modifiable." },
];

const SECTEURS = [
  { nom: "Agroalimentaire", instruments: "Balances, thermomètres et sondes, pH-mètres, hygromètres", enjeu: "Températures et pesées prouvées lors des audits clients et sanitaires." },
  { nom: "Pharmacie et santé", instruments: "Pipettes, balances, thermomètres, hygromètres", enjeu: "Chaque mesure tracée jusqu'au certificat d'étalonnage." },
  { nom: "Industrie mécanique", instruments: "Pieds à coulisse, micromètres, comparateurs, clés dynamométriques, duromètres", enjeu: "Des moyens de contrôle à jour sur chaque poste." },
  { nom: "Électricité et maintenance", instruments: "Multimètres, pinces ampèremétriques, mégohmmètres, telluromètres", enjeu: "Des appareils de vérification sûrs avant chaque intervention." },
  { nom: "Pétrole, gaz et process", instruments: "Manomètres, manomètres à vide, débitmètres, thermomètres", enjeu: "Des parcs étendus, répartis sur plusieurs sites, sans échéance oubliée." },
  { nom: "Laboratoires d'analyses et d'essais", instruments: "pH-mètres, conductivimètres, pipettes, balances, chronomètres", enjeu: "Un historique complet, prêt pour un audit qualité." },
];

const BARS = [34, 52, 26, 68, 44, 92, 58, 30, 76, 50, 40, 62];

function Brand() {
  return (
    <Link className="vt-brand" href="/" aria-label="DIOMETRO, accueil">
      <Image className="vt-mark" src="/vitrine/logo-mark-clair.webp" width={107} height={96} alt="" priority />
      <Image className="vt-word" src="/vitrine/logo-texte-clair.webp" width={307} height={44} alt="DIOMETRO" priority />
    </Link>
  );
}

export default async function HomePage() {
  // La page d'accueil reste visible même connecté (avant : redirection vers /dashboard, puis /mfa ou /login
  // quand la session n'était pas complète, ce qui donnait l'impression que le lien du site menait à l'authentification).
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // « Mon espace » seulement pour une session complète (code de vérification validé) ;
    // une connexion abandonnée en cours de route laisse les boutons « Connexion » / « Essai gratuit ».
    if (user) signedIn = (await supabase.rpc("mfa_ok")).data === true;
  } catch {
    // Supabase indisponible : la page d'accueil reste affichée.
  }
  const offers: VitrineOffer[] = OFFERS.map((o) => ({ id: o.id, nom: o.nom, cible: o.cible, instruments: o.instruments, prix: o.prix }));
  const ck = <span className="vt-ck"><IconCheck w={3} /></span>;

  return (
    <>
      <RevealObserver />
      <header className="vt-nav">
        <div className="vt-wrap">
          <Brand />
          <nav className="vt-nav-links" aria-label="Sections">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#calculateurs">Calculateurs</a>
            <a href="#formules">Formules</a>
            <a href="#questions">Questions</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="vt-nav-cta">
            {signedIn ? (
              <Link className="vt-btn vt-primary vt-small" href="/dashboard">Mon espace <IconArrow /></Link>
            ) : (
              <>
                <Link className="vt-login" href="/login">Connexion</Link>
                <Link className="vt-btn vt-primary vt-small" href="/register">Essai gratuit <IconArrow /></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="vt-hero" aria-labelledby="vt-hero-title">
          <div className="vt-bench" aria-hidden="true"><div className="vt-bench-plane" /></div>
          <div className="vt-hero-glow" aria-hidden="true" />
          <div className="vt-wrap">
            <div className="vt-hero-grid">
              <div>
                <span className="vt-pill"><b>{TRIAL_DAYS} JOURS</b> d&apos;essai gratuit</span>
                <h1 id="vt-hero-title">Le suivi métrologique de vos instruments, <span className="vt-measure">sans tableur.</span></h1>
                <p className="vt-lead">DIOMETRO centralise vos instruments de mesure, leurs étalonnages et leurs échéances. Vous êtes alerté avant qu&apos;un instrument ne soit hors délai, et vos preuves de conformité sont toujours à portée de scan.</p>
                <div className="vt-hero-actions">
                  <Link className="vt-btn vt-primary" href="/register">Démarrer l&apos;essai gratuit <IconArrow /></Link>
                  <Link className="vt-btn vt-ghost-dark" href="/login">Se connecter</Link>
                </div>
                <div className="vt-hero-proof">
                  <span><IconCheck />Toutes les fonctionnalités dès l&apos;essai</span>
                  <span><IconCheck />Vos données ne sont jamais supprimées</span>
                </div>
              </div>
              <HeroStage />
            </div>
            <EcheancierDemo />
          </div>
        </section>

        <section className="vt-stats" aria-label="DIOMETRO en chiffres">
          <div className="vt-wrap">
            <div className="vt-stat"><div className="vt-n">{NB_TYPES}<small>types</small></div><p>d&apos;instruments au catalogue, enrichi en continu</p></div>
            <div className="vt-stat"><div className="vt-n">{NB_CALCULATEURS}<small>calculateurs</small></div><p>de conformité, reliés à la fiche de chaque instrument</p></div>
            <div className="vt-stat"><div className="vt-n">{TRIAL_DAYS}<small>jours</small></div><p>d&apos;essai gratuit avec toutes les fonctionnalités</p></div>
            <div className="vt-stat"><div className="vt-n">{MAX_INSTRUMENTS.toLocaleString("fr-FR")}+<small>instruments</small></div><p>suivis par entreprise, selon la formule choisie</p></div>
          </div>
        </section>

        <section className="vt-section" id="fonctionnalites" aria-labelledby="vt-f-title">
          <div className="vt-wrap">
            <div className="vt-section-head vt-reveal">
              <span className="vt-eyebrow">Fonctionnalités</span>
              <h2 id="vt-f-title">Tout ce qu&apos;il faut pour tenir vos instruments à jour.</h2>
              <p className="vt-lead">Du premier enregistrement à l&apos;audit, chaque instrument a sa fiche, son échéance et son historique. Rien ne dépend plus d&apos;un fichier Excel partagé.</p>
            </div>
            <div className="vt-bento">
              <Tilt className="vt-span-4">
                <div className="vt-lift"><div className="vt-ico"><IconBell /></div></div>
                <h3>Échéances et alertes</h3>
                <p>Chaque instrument a sa prochaine échéance, calculée automatiquement. Alertes à l&apos;écran et par e-mail avant l&apos;expiration, classées par urgence.</p>
                <div className="vt-alert-list">
                  <div className="vt-alert-row"><span>Manomètre KELLER <span className="vt-ref">· MAN-03</span></span><span className="vt-tag vt-late">En retard de 41 j</span></div>
                  <div className="vt-alert-row"><span>Balance de précision <span className="vt-ref">· BAL-02</span></span><span className="vt-tag vt-o">Dans 9 j</span></div>
                  <div className="vt-alert-row"><span>Pipette 100–1000 µL <span className="vt-ref">· PIP-07</span></span><span className="vt-tag vt-y">Dans 26 j</span></div>
                  <div className="vt-alert-row"><span>Sonde Pt100 <span className="vt-ref">· PT-11</span></span><span className="vt-tag vt-ok">Dans 211 j</span></div>
                </div>
              </Tilt>
              <Tilt className="vt-dark vt-span-2">
                <div className="vt-lift"><div className="vt-ico"><IconQr /></div></div>
                <h3>QR codes et étiquettes</h3>
                <p>Un scan ouvre la fiche à jour de l&apos;instrument, sans connexion. Étiquettes imprimées en un clic.</p>
                <div className="vt-qr-box">
                  <div className="vt-qr-label"><QrPattern seed={7} label="QR code d'exemple" /><div className="vt-cap">PT-11 · exemple</div></div>
                  <ul className="vt-ticks vt-lift">
                    <li><IconCheck />Fiche en lecture seule</li>
                    <li><IconCheck />Données utiles au terrain</li>
                    <li><IconCheck />Lien révocable</li>
                  </ul>
                </div>
              </Tilt>
              <Tilt className="vt-span-2">
                <div className="vt-lift"><div className="vt-ico"><IconCalc /></div></div>
                <h3>Calculateurs de conformité</h3>
                <p>Saisissez vos relevés : l&apos;écart et le verdict sont calculés, et le résultat alimente la fiche de l&apos;instrument.</p>
                <div className="vt-lift2" style={{ marginTop: 18 }}><a className="vt-btn vt-ghost vt-small" href="#calculateurs">Essayer l&apos;exemple <IconArrow /></a></div>
              </Tilt>
              <Tilt className="vt-span-2">
                <div className="vt-lift"><div className="vt-ico"><IconFile /></div></div>
                <h3>Fiches de vie</h3>
                <p>Historique complet des étalonnages et interventions, avec certificats, procédures et photos joints.</p>
                <div className="vt-files">
                  <span className="vt-file"><b style={{ background: "var(--late)" }}>PDF</b>Certificat 2026</span>
                  <span className="vt-file"><b style={{ background: "var(--ok)" }}>XLS</b>Relevés</span>
                  <span className="vt-file"><b style={{ background: "var(--wine-mid)" }}>JPG</b>Photo</span>
                </div>
              </Tilt>
              <Tilt className="vt-span-2">
                <div className="vt-lift"><div className="vt-ico"><IconDownload /></div></div>
                <h3>Exports et audit</h3>
                <p>Excel et PDF en un clic. Journal d&apos;audit non modifiable : qui a fait quoi, et quand.</p>
                <div className="vt-log vt-lift">
                  <div><time>18:02</time><span>Tolérance <s>0,1 bar</s> → <ins>0,2 bar</ins></span></div>
                  <div><time>17:40</time><span>Étalonnage ajouté · PT-11</span></div>
                </div>
              </Tilt>
              <Tilt className="vt-span-3">
                <div className="vt-lift"><div className="vt-ico"><IconCalendar /></div></div>
                <h3>Planning et inventaire</h3>
                <p>Calendrier mensuel, charge de travail sur 12 mois, inventaire physique avec historique des manquants.</p>
                <div className="vt-bars" role="img" aria-label="Exemple de charge d'étalonnage par mois sur 12 mois, avec un pic en juin">
                  {BARS.map((v, k) => <div key={k} className={`vt-bar${v === 92 ? " vt-peak" : ""}`} style={{ height: `${v}%` }}><span>{"JFMAMJJASOND"[k]}</span></div>)}
                </div>
                <div style={{ height: 16 }} />
              </Tilt>
              <Tilt className="vt-span-3">
                <div className="vt-lift"><div className="vt-ico"><IconBuilding /></div></div>
                <h3>Prestataires</h3>
                <p>Carnet de laboratoires, accréditations, délais, tarifs en FCFA et comparateur par domaine de mesure.</p>
                <div className="vt-labs">
                  <div className="vt-lab"><span>Labo Thermique (exemple) · Température</span><span className="vt-m">Accrédité · 8 j</span></div>
                  <div className="vt-lab"><span>Labo Pression (exemple) · Pression</span><span className="vt-m">Accrédité · 12 j</span></div>
                </div>
              </Tilt>
            </div>
          </div>
        </section>

        <section className="vt-section vt-calc-band" id="calculateurs" aria-labelledby="vt-c-title">
          <div className="vt-wrap vt-calc-grid">
            <div className="vt-reveal">
              <span className="vt-eyebrow">Calculateurs de conformité</span>
              <h2 id="vt-c-title" style={{ marginTop: 16 }}>Vous saisissez. DIOMETRO calcule.</h2>
              <p className="vt-lead" style={{ marginTop: 16 }}>Les écarts sont calculés à partir de vos relevés, et le résultat met à jour la conformité et l&apos;échéance de l&apos;instrument.</p>
              <ul className="vt-checks">
                <li>{ck}<span><b>Comparaison à un étalon</b>, point par point, avec l&apos;écart et le verdict.</span></li>
                <li>{ck}<span><b>Erreur maximale tolérée</b> reprise de la fiche de l&apos;instrument : pas de double saisie.</span></li>
                <li>{ck}<span><b>Fiche de vie</b> : le résultat y est enregistré, la conformité et l&apos;échéance se mettent à jour.</span></li>
              </ul>
              <p className="vt-calc-note">Ces calculs vous aident à décider. Ils ne remplacent pas un certificat d&apos;étalonnage délivré par un laboratoire accrédité.</p>
            </div>
            <CalcDemo />
          </div>
        </section>

        <section className="vt-section" id="secteurs" aria-labelledby="vt-sect-title">
          <div className="vt-wrap">
            <div className="vt-section-head vt-reveal">
              <span className="vt-eyebrow">Pour qui</span>
              <h2 id="vt-sect-title">Pensé pour les parcs d&apos;instruments de terrain.</h2>
              <p className="vt-lead">De l&apos;atelier au laboratoire, les instruments de chaque secteur figurent déjà au catalogue, avec leur démarche d&apos;étalonnage.</p>
            </div>
            <div className="vt-sectors">
              {SECTEURS.map((s) => (
                <article key={s.nom} className="vt-sector vt-reveal">
                  <h3>{s.nom}</h3>
                  <p>{s.enjeu}</p>
                  <div className="vt-meta">{s.instruments}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="vt-section" aria-labelledby="vt-s-title">
          <div className="vt-wrap">
            <div className="vt-section-head vt-reveal">
              <span className="vt-eyebrow">Mise en route</span>
              <h2 id="vt-s-title">Opérationnel le jour même.</h2>
            </div>
            <div className="vt-steps">
              <div className="vt-step vt-reveal"><div className="vt-num">01</div><h3>Créez votre espace</h3><p>Inscription en 2 minutes, essai gratuit de {TRIAL_DAYS} jours.</p><div className="vt-meta">≈ 2 min</div></div>
              <div className="vt-step vt-reveal"><div className="vt-num">02</div><h3>Ajoutez vos instruments</h3><p>Saisissez-les avec leurs documents et photos, depuis une tablette si besoin, ou importez votre fichier Excel.</p><div className="vt-meta">Excel ou saisie</div></div>
              <div className="vt-step vt-reveal"><div className="vt-num">03</div><h3>Laissez DIOMETRO vous prévenir</h3><p>Échéances, alertes, calculs de conformité et étiquettes QR : tout est prêt.</p><div className="vt-meta">Alertes e-mail</div></div>
            </div>
          </div>
        </section>

        <section className="vt-section vt-dark-band" id="securite" aria-labelledby="vt-sec-title">
          <SecurityStack>
            <span className="vt-eyebrow">Sécurité</span>
            <h2 id="vt-sec-title" style={{ marginTop: 16 }}>Vos preuves d&apos;audit méritent mieux qu&apos;un fichier partagé.</h2>
            <p className="vt-lead" style={{ marginTop: 16 }}>Conçu pour des responsables qualité qui doivent pouvoir répondre à un auditeur, preuve à l&apos;appui. Quatre protections empilées, de l&apos;accès au lien public.</p>
          </SecurityStack>
        </section>

        <section className="vt-section" id="formules" aria-labelledby="vt-p-title">
          <div className="vt-wrap">
            <div className="vt-section-head vt-pr-head vt-reveal">
              <span className="vt-eyebrow">Formules</span>
              <h2 id="vt-p-title">La formule qui correspond à votre parc.</h2>
              <p className="vt-lead">Toutes les fonctionnalités dans chaque formule : seule la capacité d&apos;instruments change. Indiquez la taille de votre parc, la formule adaptée s&apos;affiche.</p>
            </div>
            <PlanPicker offers={offers} />
            <div className="vt-trial vt-reveal"><div className="vt-n">{TRIAL_DAYS}<small>jours</small></div><p><b>Essai gratuit avec toutes les fonctionnalités</b> (jusqu&apos;à 50 instruments le temps de l&apos;essai), puis choix de la formule adaptée à votre parc. Il n&apos;y a pas de formule gratuite : à la fin de l&apos;essai, le compte passe en <b>lecture seule</b> jusqu&apos;au paiement. <b>Vos données ne sont jamais supprimées.</b></p></div>
          </div>
        </section>

        <section className="vt-section" id="questions" aria-labelledby="vt-q-title" style={{ paddingTop: 0 }}>
          <div className="vt-wrap vt-faq-grid">
            <div className="vt-reveal">
              <span className="vt-eyebrow">Questions fréquentes</span>
              <h2 id="vt-q-title" style={{ marginTop: 16 }}>Les réponses, avant de vous lancer.</h2>
              {LEGAL.email ? (
                <div className="vt-faq-contact">
                  <b>Une autre question ?</b>
                  <p>Écrivez-nous, nous vous répondons personnellement.</p>
                  <a className="vt-btn vt-ghost" href="#contact">Nos coordonnées <IconArrow /></a>
                </div>
              ) : null}
            </div>
            <div className="vt-faq">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}<span className="vt-pm"><IconPlus /></span></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="vt-section" id="contact" aria-labelledby="vt-ct-title" style={{ paddingTop: 0 }}>
          <div className="vt-wrap vt-contact">
            <div className="vt-reveal">
              <span className="vt-eyebrow">Contact</span>
              <h2 id="vt-ct-title" style={{ marginTop: 16 }}>Parlons de votre parc d&apos;instruments.</h2>
              <p className="vt-lead" style={{ marginTop: 14 }}>Une question, un devis pour un grand parc ou un besoin particulier : écrivez-nous, nous vous répondons personnellement.</p>
            </div>
            <div className="vt-contact-card vt-reveal">
              {CONTACT.email ? (
                <div className="vt-contact-row">
                  <span className="vt-ico"><IconMail /></span>
                  <div><span className="vt-contact-k">E-mail</span><a href={`mailto:${CONTACT.email}`}>{CONTACT.email.split("@")[0]}<wbr />@{CONTACT.email.split("@")[1]}</a></div>
                  <CopyText text={CONTACT.email} label="Copier l'adresse e-mail" />
                </div>
              ) : null}
              {CONTACT.telephone ? (
                <div className="vt-contact-row">
                  <span className="vt-ico"><IconPhone /></span>
                  <div><span className="vt-contact-k">Téléphone</span><a href={`tel:${CONTACT.telephone.replace(/\s/g, "")}`}>{CONTACT.telephone}</a></div>
                </div>
              ) : null}
              {CONTACT.whatsapp ? (
                <div className="vt-contact-row">
                  <span className="vt-ico"><IconWhatsapp /></span>
                  <div><span className="vt-contact-k">WhatsApp</span><a href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{CONTACT.whatsapp}</a></div>
                </div>
              ) : null}
              {RESEAUX.length > 0 ? (
                <div className="vt-socials" aria-label="Réseaux sociaux">
                  {RESEAUX.map(([id, nom, url]) => (
                    <a key={id} href={url} target="_blank" rel="noopener noreferrer" aria-label={`DIOMETRO sur ${nom}`}>
                      {id === "linkedin" ? <IconLinkedin /> : id === "facebook" ? <IconFacebook /> : <IconInstagram />}
                    </a>
                  ))}
                </div>
              ) : null}
              <Link className="vt-btn vt-primary" href="/devis">Demander un devis <IconArrow /></Link>
            </div>
          </div>
        </section>

        <section className="vt-final">
          <div className="vt-wrap">
            <div className="vt-final-box vt-reveal">
              <div>
                <h2>Votre prochain audit, préparé dès aujourd&apos;hui.</h2>
                <p>{TRIAL_DAYS} jours d&apos;essai gratuit avec toutes les fonctionnalités. Vos données restent à vous.</p>
                <div className="vt-hero-actions">
                  <Link className="vt-btn vt-primary" href="/register">Démarrer l&apos;essai gratuit <IconArrow /></Link>
                  <Link className="vt-btn vt-ghost-dark" href="/login">Se connecter</Link>
                </div>
              </div>
              <div className="vt-label-scene" aria-hidden="true">
                <div className="vt-etiquette">
                  <QrPattern seed={19} />
                  <div><div className="vt-r">PAC-014</div><div className="vt-d">Pied à coulisse 0–150 mm<br />Prochain étalonnage 13/06/2027</div><div className="vt-n">● Conforme</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="vt-footer">
        <div className="vt-wrap">
          <div className="vt-foot">
            <div>
              <Brand />
              <p style={{ maxWidth: "40ch" }}>Le suivi métrologique des instruments de mesure : échéances, conformité, preuves d&apos;audit.</p>
            </div>
            <div><h4>Produit</h4><ul><li><a href="#fonctionnalites">Fonctionnalités</a></li><li><a href="#calculateurs">Calculateurs</a></li><li><a href="#secteurs">Secteurs</a></li><li><a href="#formules">Formules</a></li><li><a href="#questions">Questions fréquentes</a></li></ul></div>
            <div><h4>Compte</h4><ul><li><Link href="/register">Essai gratuit</Link></li><li><Link href="/login">Connexion</Link></li><li><Link href="/forgot-password">Mot de passe oublié</Link></li></ul></div>
            {LEGAL.email ? (
              <div><h4>Contact</h4><ul><li><a href="#contact">Nos coordonnées</a></li><li><a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li><li><Link href="/devis">Demander un devis</Link></li>{LEGAL.telephone ? <li><a href={`tel:${LEGAL.telephone.replace(/\s/g, "")}`}>{LEGAL.telephone}</a></li> : null}</ul></div>
            ) : null}
          </div>
          <div className="vt-foot-bottom">
            <span>© {new Date().getFullYear()} DIOMETRO · Suivi métrologique</span>
            <nav aria-label="Informations légales"><Link href="/mentions-legales">Mentions légales</Link><Link href="/cgu">Conditions générales d&apos;utilisation</Link><Link href="/confidentialite">Politique de confidentialité</Link></nav>
          </div>
        </div>
      </footer>
    </>
  );
}
