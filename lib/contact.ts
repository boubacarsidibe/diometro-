import "server-only";
import { LEGAL } from "@/lib/legal";

// Coordonnées affichées dans la section Contact de l'accueil.
// Une ligne vide n'est pas affichée : renseigner le numéro ou le lien suffit pour qu'il apparaisse, avec son icône.
export const CONTACT = {
  email: LEGAL.email,
  telephone: LEGAL.telephone ?? "", // ex. "+221 77 000 00 00"
  whatsapp: "", // numéro au format international, ex. "+221770000000"
  linkedin: "", // ex. "https://www.linkedin.com/company/diometro"
  facebook: "", // ex. "https://www.facebook.com/diometro"
  instagram: "", // ex. "https://www.instagram.com/diometro"
};

export const RESEAUX = (
  [
    ["linkedin", "LinkedIn", CONTACT.linkedin],
    ["facebook", "Facebook", CONTACT.facebook],
    ["instagram", "Instagram", CONTACT.instagram],
  ] as const
).filter(([, , url]) => url.startsWith("https://"));
