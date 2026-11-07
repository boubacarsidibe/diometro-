import "server-only";

// Informations légales de l'éditeur. À renseigner via les variables d'environnement (Vercel) :
// LEGAL_ENTITY_NAME, LEGAL_ENTITY_FORM, LEGAL_ADDRESS, LEGAL_NINEA, LEGAL_DIRECTOR, LEGAL_CONTACT_EMAIL, LEGAL_PHONE,
// LEGAL_JURISDICTION, LEGAL_CDP_REF. Tant qu'une valeur manque, la page l'indique clairement (aucune donnée inventée).
const field = (name: string) => process.env[name]?.trim() || null;

export const LEGAL = {
  version: "2026-11-07",
  nom: field("LEGAL_ENTITY_NAME"),
  forme: field("LEGAL_ENTITY_FORM"),
  adresse: field("LEGAL_ADDRESS"),
  ninea: field("LEGAL_NINEA"),
  directeur: field("LEGAL_DIRECTOR"),
  email: field("LEGAL_CONTACT_EMAIL"),
  telephone: field("LEGAL_PHONE"),
  juridiction: field("LEGAL_JURISDICTION"),
  cdp: field("LEGAL_CDP_REF"),
};

export const missingLegalFields = () => Object.entries(LEGAL).filter(([k, v]) => k !== "version" && !v).map(([k]) => k);
