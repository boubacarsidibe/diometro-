import { Topbar } from "@/components/Topbar";
import { requireSession } from "@/lib/session";

const FAQ: { q: string; a: string }[] = [
  { q: "Comment ajouter un instrument ?", a: "Menu Instruments puis « Ajouter un instrument » (rôles administrateur et coordinateur). Renseignez au minimum la référence et la désignation ; indiquez la prochaine échéance pour être alerté." },
  { q: "Que signifient les couleurs d'échéance ?", a: "Rouge : échéance dépassée. Orange : moins de 15 jours. Jaune : 30 jours ou moins. Vert : à jour. Seuls les instruments « En service » comptent dans les alertes." },
  { q: "Comment enregistrer un étalonnage ?", a: "Ouvrez la fiche de l'instrument et ajoutez une intervention (bouton « Étalonner » pour le calculateur, ou « Ajouter une intervention » en bas de la fiche). Pour un étalonnage ou une vérification, la conformité de l'instrument est mise à jour selon le résultat, et la prochaine échéance est recalculée si une fréquence est renseignée." },
  { q: "Comment fonctionne la fréquence d'étalonnage ?", a: "Sur la fiche de l'instrument, indiquez un nombre et une unité : jours, semaines, mois ou années (ex. : 12 mois). À chaque étalonnage ou vérification enregistré, la prochaine échéance = date de l'intervention + fréquence. Sans fréquence, saisissez la prochaine échéance à la main. Une intervention saisie avec une date plus ancienne ne remplace pas une échéance plus récente." },
  { q: "Que signifient les statuts ?", a: "En service : utilisé, suivi dans les alertes. En réparation : parti en réparation, reviendra. Hors service : arrêté temporairement. Mis au rebut : retiré définitivement ; la fiche et son historique restent consultables pour la traçabilité, mais il n'a plus d'échéance ni d'alerte." },
  { q: "Quels rôles existent ?", a: "Administrateur : tout, y compris paramètres, corbeille et audit. Coordinateur : gère les instruments, prestataires, inventaires et les comptes des autres coordinateurs et consultants. Consultation : lecture seule." },
  { q: "Pourquoi un code à 6 chiffres à la connexion ?", a: "La double authentification protège vos données métrologiques. Après votre mot de passe, un code à 6 chiffres vous est envoyé par e-mail à chaque connexion. Il est valable 10 minutes et ne sert qu'une fois ; après 5 essais faux, il est bloqué et il faut en demander un nouveau (bouton « Renvoyer un code », 5 envois par heure au maximum). Pensez à regarder vos courriers indésirables." },
  { q: "Puis-je utiliser une application d'authentification à la place de l'e-mail ?", a: "Oui. Sur l'écran du code, choisissez « Configurer une application d'authentification » (Google Authenticator, Microsoft Authenticator…) et scannez le QR code. DIOMETRO retient la dernière méthode utilisée ; vous pouvez revenir au code par e-mail à tout moment depuis le même écran. En cas de téléphone perdu, utilisez le code par e-mail ou contactez votre administrateur." },
  { q: "Comment imprimer des QR codes ?", a: "Menu « QR codes et étiquettes » : cochez les instruments puis « Imprimer » ou « Exporter en Word ». Depuis la fiche d'un instrument, vous pouvez aussi télécharger son QR code (PNG) ou imprimer sa seule étiquette. Scanner le QR code ouvre, sans connexion, une fiche publique en lecture seule (référence, statut, échéance, conformité, lieu), désactivable depuis la fiche." },
  { q: "Comment faire un inventaire ?", a: "Menu Inventaire : démarrez un inventaire, cochez chaque instrument retrouvé, puis clôturez. Le détail des instruments manquants est conservé dans l'historique." },
  { q: "Où sont mes exports ?", a: "Instruments : boutons « Excel » et « PDF ». Fiche de vie PDF : bouton sur la fiche de l'instrument. Journal d'audit : bouton Excel sur la page Audit trail (administrateur)." },
  { q: "Quels fichiers puis-je joindre ?", a: "PDF, images (PNG, JPEG, WebP), Excel et Word, 10 Mo maximum par fichier. Ils sont stockés de façon privée et visibles uniquement par votre entreprise." },
  { q: "Un élément supprimé est-il perdu ?", a: "Non : les instruments et prestataires sont archivés. Un administrateur les restaure depuis la Corbeille." },
];

export default async function AidePage() {
  await requireSession();
  return (
    <>
      <Topbar title="Aide et questions fréquentes" subtitle="Réponses rapides pour bien utiliser DIOMETRO." />
      <div className="content faq">
        {FAQ.map((f) => (<details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}
      </div>
    </>
  );
}
