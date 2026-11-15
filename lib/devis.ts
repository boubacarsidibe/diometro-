// Fiche de demande de devis (page /devis) : options partagées par le formulaire et la validation serveur.

export const SECTEURS = [
  "Agroalimentaire", "Pharmacie et santé", "Industrie mécanique", "Électricité et maintenance",
  "Pétrole, gaz et process", "Laboratoire d'analyses ou d'essais", "BTP et matériaux", "Mines et carrières", "Autre",
] as const;

export const TAILLES = ["Moins de 50", "50 à 200", "200 à 500", "500 à 1 000", "1 000 à 2 000", "Plus de 2 000", "Je ne sais pas encore"] as const;

export const FAMILLES = [
  "Pipettes et volumétrie", "Balances et masses", "Températures (thermomètres, sondes, enceintes)", "Pression (manomètres)",
  "Dimensionnel (pieds à coulisse, micromètres, comparateurs)", "Électrique (multimètres, pinces, mégohmmètres)",
  "Analyse (pH-mètres, conductivimètres)", "Couple, dureté, débit, autres",
] as const;

export const OUTILS = ["Fichier Excel", "Papier ou classeur", "Un logiciel", "Rien de formalisé", "Autre"] as const;

export const DELAIS = ["Dès que possible", "Dans les 3 mois", "Dans 3 à 6 mois", "Plus tard / je me renseigne"] as const;

export type DevisData = {
  entreprise: string; secteur: string; pays: string; ville: string; sites: string;
  nom: string; fonction: string; email: string; telephone: string;
  taille: string; familles: string[]; utilisateurs: string; outil: string; delai: string; message: string;
};

export type DevisResult = { data?: DevisData; errors: Partial<Record<keyof DevisData | "consent", string>> };

const clean = (v: FormDataEntryValue | null, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
const oneOf = (v: string, list: readonly string[]) => (list.includes(v) ? v : "");
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;

export function parseDevis(fd: FormData): DevisResult {
  const d: DevisData = {
    entreprise: clean(fd.get("entreprise"), 120),
    secteur: oneOf(clean(fd.get("secteur")), SECTEURS),
    pays: clean(fd.get("pays"), 60),
    ville: clean(fd.get("ville"), 80),
    sites: clean(fd.get("sites"), 10).replace(/\D/g, ""),
    nom: clean(fd.get("nom"), 100),
    fonction: clean(fd.get("fonction"), 100),
    email: clean(fd.get("email"), 160).toLowerCase(),
    telephone: clean(fd.get("telephone"), 30).replace(/[^\d+ ().-]/g, ""),
    taille: oneOf(clean(fd.get("taille")), TAILLES),
    familles: fd.getAll("familles").map((v) => clean(v)).filter((v) => (FAMILLES as readonly string[]).includes(v)),
    utilisateurs: clean(fd.get("utilisateurs"), 10).replace(/\D/g, ""),
    outil: oneOf(clean(fd.get("outil")), OUTILS),
    delai: oneOf(clean(fd.get("delai")), DELAIS),
    message: clean(fd.get("message"), 2000),
  };
  const errors: DevisResult["errors"] = {};
  if (d.entreprise.length < 2) errors.entreprise = "Indiquez le nom de l'entreprise.";
  if (!d.secteur) errors.secteur = "Choisissez un secteur.";
  if (d.nom.length < 2) errors.nom = "Indiquez votre nom.";
  if (!EMAIL.test(d.email)) errors.email = "Indiquez une adresse e-mail valide.";
  if (!d.taille) errors.taille = "Choisissez une taille de parc.";
  if (fd.get("consent") !== "on") errors.consent = "Cochez cette case pour que nous puissions vous répondre.";
  return Object.keys(errors).length ? { errors } : { data: d, errors };
}

export function devisLines(d: DevisData): [string, string][] {
  const lieu = [d.ville, d.pays].filter(Boolean).join(", ");
  return ([
    ["Entreprise", d.entreprise], ["Secteur", d.secteur], ["Lieu", lieu], ["Nombre de sites", d.sites],
    ["Contact", d.fonction ? `${d.nom} (${d.fonction})` : d.nom], ["E-mail", d.email], ["Téléphone", d.telephone],
    ["Taille du parc", d.taille], ["Familles d'instruments", d.familles.join(", ")], ["Utilisateurs prévus", d.utilisateurs],
    ["Outil actuel", d.outil], ["Mise en place", d.delai], ["Message", d.message],
  ] as [string, string][]).filter(([, v]) => v);
}
