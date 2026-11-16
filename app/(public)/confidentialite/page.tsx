import type { Metadata } from "next";
import { INDEXABLE } from "@/lib/seo";
import { Missing } from "@/components/LegalLayout";
import { LEGAL, missingLegalFields } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité · DIOMETRO", robots: INDEXABLE };

export default function ConfidentialitePage() {
  const L = LEGAL;
  return (
    <article className="prose">
      <h1>Politique de confidentialité</h1>
      {missingLegalFields().length > 0 && <div className="notice err">Document provisoire : certaines informations de l&apos;éditeur restent à renseigner.</div>}
      <p className="helper">Version du {L.version}</p>
      <p>Cette politique explique quelles données personnelles DIOMETRO traite, pourquoi, et quels sont vos droits, conformément à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel.</p>

      <h2>Responsable du traitement</h2>
      <p>{L.nom ?? <Missing>raison sociale</Missing>} — {L.adresse ?? <Missing>adresse</Missing>} — contact : {L.email ?? <Missing>email</Missing>}.{L.cdp ? ` Référence CDP : ${L.cdp}.` : <> Déclaration ou autorisation auprès de la Commission de Protection des Données Personnelles (CDP) : <Missing>référence</Missing>.</>}</p>

      <h2>Données traitées</h2>
      <ul>
        <li><strong>Compte :</strong> adresse email, nom affiché, téléphone (facultatif), rôle, mot de passe (conservé uniquement sous forme chiffrée irréversible), preuve d&apos;acceptation des conditions.</li>
        <li><strong>Entreprise :</strong> nom, secteur, téléphone, bâtiments, logo, formule.</li>
        <li><strong>Données métier saisies par le client :</strong> instruments, interventions, prestataires (dont contacts professionnels), inventaires, documents et photos joints.</li>
        <li><strong>Journal d&apos;audit :</strong> actions réalisées, auteur et date, pour la traçabilité. Il inclut l&apos;historique des connexions (connexion, échec de code, déconnexion, méthode utilisée), consultable par les administrateurs de l&apos;entreprise, sans adresse IP ni identifiant d&apos;appareil.</li>
        <li><strong>Données techniques :</strong> journaux de connexion et de sécurité nécessaires au fonctionnement.</li>
      </ul>

      <h2>Finalités et bases</h2>
      <ul>
        <li>Fournir le Service et gérer les comptes (exécution du contrat).</li>
        <li>Sécuriser le Service : double authentification, prévention des abus, audit (intérêt légitime).</li>
        <li>Envoyer les emails de service : confirmation, invitation, réinitialisation, alertes d&apos;échéance (exécution du contrat).</li>
        <li>Notifications du navigateur : uniquement si vous les activez (consentement).</li>
      </ul>

      <h2>Destinataires et sous-traitants</h2>
      <ul>
        <li><strong>Supabase</strong> : base de données, authentification et stockage des fichiers, région Europe (Londres, Royaume-Uni).</li>
        <li><strong>Vercel</strong> : hébergement de l&apos;application (infrastructure internationale, notamment États-Unis).</li>
        <li><strong>Fournisseur d&apos;envoi d&apos;emails</strong> : <Missing>à préciser</Missing>.</li>
      </ul>
      <p>Les données d&apos;une entreprise ne sont jamais accessibles aux autres entreprises ; l&apos;opérateur du Service ne voit que des totaux (nombre d&apos;utilisateurs et d&apos;instruments) pour la gestion des abonnements. Ces sous-traitants sont situés hors du Sénégal : ces transferts sont encadrés conformément à la loi 2008-12 et aux exigences de la CDP.</p>

      <h2>Durée de conservation</h2>
      <p>Les données sont conservées tant que le compte existe. La fin de l&apos;essai ou d&apos;un abonnement ne supprime pas les données : le compte passe en lecture seule. Après clôture du compte à votre demande, les données sont supprimées ou anonymisées sous <Missing>délai à préciser</Missing>, hors obligations légales de conservation.</p>

      <h2>Vos droits</h2>
      <p>Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition et de suppression de vos données personnelles. Pour les exercer : {L.email ?? <Missing>email</Missing>}. Vous pouvez aussi saisir la CDP.</p>

      <h2>Sécurité</h2>
      <p>Connexions chiffrées (HTTPS), mots de passe chiffrés, double authentification obligatoire, isolation stricte des données entre entreprises appliquée par la base de données, journal d&apos;audit non modifiable, fichiers stockés en privé.</p>

      <h2>Cookies</h2>
      <p>DIOMETRO utilise uniquement des cookies strictement nécessaires (maintien de la session de connexion). Aucun cookie publicitaire ni de mesure d&apos;audience tiers n&apos;est utilisé.</p>

      <h2>Modifications</h2>
      <p>Cette politique peut évoluer ; la version en vigueur est celle publiée ici, avec sa date.</p>
    </article>
  );
}
