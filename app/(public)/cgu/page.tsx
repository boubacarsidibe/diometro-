import type { Metadata } from "next";
import { INDEXABLE } from "@/lib/seo";
import { Missing } from "@/components/LegalLayout";
import { LEGAL, missingLegalFields } from "@/lib/legal";
import { TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = { title: "Conditions générales d'utilisation · DIOMETRO", robots: INDEXABLE };

export default function CguPage() {
  const L = LEGAL;
  return (
    <article className="prose">
      <h1>Conditions générales d&apos;utilisation</h1>
      {missingLegalFields().length > 0 && <div className="notice err">Document provisoire : certaines informations de l&apos;éditeur restent à renseigner.</div>}
      <p className="helper">Version du {L.version}</p>

      <h2>1. Objet</h2>
      <p>Les présentes conditions encadrent l&apos;utilisation du service en ligne DIOMETRO (le « Service »), édité par {L.nom ?? <Missing>raison sociale</Missing>} (l&apos;« Éditeur »), qui permet de suivre les instruments de mesure, leurs étalonnages et leurs échéances. Créer un compte vaut acceptation de ces conditions.</p>

      <h2>2. Compte et sécurité</h2>
      <p>Le compte est rattaché à une entreprise. L&apos;utilisateur fournit des informations exactes, garde ses identifiants confidentiels et active la double authentification, obligatoire. Il est responsable des actions réalisées avec son compte et prévient l&apos;Éditeur en cas de compromission. L&apos;administrateur de l&apos;entreprise gère les droits de ses utilisateurs (administrateur, coordinateur, consultation).</p>

      <h2>3. Période d&apos;essai</h2>
      <p>Chaque nouvelle entreprise bénéficie d&apos;un essai gratuit de {TRIAL_DAYS} jours, avec les fonctionnalités du Service, dans la limite d&apos;instruments de l&apos;essai. Il n&apos;existe pas de formule gratuite permanente.</p>

      <h2>4. Formules et paiement</h2>
      <p>Au-delà de l&apos;essai, l&apos;usage complet du Service nécessite une formule payante, dont la capacité maximale d&apos;instruments et le prix figurent sur la page de présentation ou dans l&apos;offre commerciale. Les modalités de paiement sont précisées lors de la souscription.</p>

      <h2>5. Lecture seule en fin d&apos;essai ou à défaut de paiement</h2>
      <p>À la fin de l&apos;essai de {TRIAL_DAYS} jours, ou si l&apos;abonnement arrive à échéance sans renouvellement, le compte passe automatiquement en <strong>lecture seule</strong> : l&apos;utilisateur peut consulter et exporter ses données, mais ne peut plus en créer ni en modifier. <strong>Les données ne sont jamais supprimées</strong> du fait de cette bascule. L&apos;écriture est rétablie dès la souscription ou le règlement de la formule.</p>

      <h2>6. Données de l&apos;utilisateur</h2>
      <p>L&apos;utilisateur reste propriétaire des données qu&apos;il saisit (instruments, interventions, documents). Il garantit avoir le droit de les enregistrer. Il peut les exporter à tout moment (Excel, PDF) tant que son compte est accessible. Les QR codes d&apos;instrument ouvrent une fiche publique en lecture seule, limitée à la référence, la désignation, le statut, les dates d&apos;étalonnage, la conformité et le lieu ; l&apos;utilisateur peut la désactiver à tout moment.</p>

      <h2>7. Usage acceptable</h2>
      <p>Il est interdit de porter atteinte à la sécurité du Service, d&apos;accéder aux données d&apos;une autre entreprise, de déposer des contenus illicites ou malveillants, ou de contourner les limites de la formule.</p>

      <h2>8. Nature de l&apos;outil et responsabilité</h2>
      <p>Le Service, y compris ses calculateurs (pipettes, thermomètres, comparaison directe) et ses procédures, est une aide à la décision. Il ne remplace ni un laboratoire accrédité, ni le jugement d&apos;un métrologue. L&apos;utilisateur vérifie les résultats et reste responsable de ses décisions de conformité et du respect de ses obligations réglementaires ou normatives. L&apos;Éditeur n&apos;est tenu que d&apos;une obligation de moyens et n&apos;est pas responsable des dommages indirects, notamment de la perte d&apos;exploitation.</p>

      <h2>9. Disponibilité</h2>
      <p>L&apos;Éditeur s&apos;efforce d&apos;assurer un accès continu au Service mais ne garantit pas l&apos;absence d&apos;interruption (maintenance, incident, dépendance à des prestataires d&apos;hébergement).</p>

      <h2>10. Données personnelles</h2>
      <p>Le traitement des données personnelles est décrit dans la <a href="/confidentialite">politique de confidentialité</a>.</p>

      <h2>11. Résiliation</h2>
      <p>L&apos;utilisateur peut cesser d&apos;utiliser le Service et demander la clôture de son compte à {L.email ?? <Missing>email de contact</Missing>}. L&apos;Éditeur peut suspendre un compte en cas de manquement grave à ces conditions, après information de l&apos;utilisateur lorsque c&apos;est possible.</p>

      <h2>12. Modification des conditions</h2>
      <p>L&apos;Éditeur peut faire évoluer ces conditions ; la version en vigueur est celle publiée sur cette page, avec sa date. Les utilisateurs sont informés des changements importants.</p>

      <h2>13. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit sénégalais. Tout litige relève de {L.juridiction ?? <Missing>juridiction compétente</Missing>}, après tentative de règlement amiable.</p>
    </article>
  );
}
