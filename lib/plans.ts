import type { PLANS } from "@/lib/schemas";

type PlanId = (typeof PLANS)[number]["id"];

// Formules proposées. Capacités = limites d'instruments appliquées par la base (voir lib/schemas.ts PLANS).
// Les prix seront renseignés ici dès qu'ils sont arrêtés : tant que `prix` est null, la page affiche « Tarif communiqué prochainement ».
export type Offer = {
  id: Exclude<PlanId, "essai">; nom: string; instruments: number | null; cible: string;
  prix: { mensuel: number; annuel: number } | null; // en FCFA (XOF)
};

export const OFFERS: Offer[] = [
  { id: "starter", nom: "Starter", instruments: 50, cible: "Petits ateliers et laboratoires", prix: null },
  { id: "standard", nom: "Standard", instruments: 200, cible: "PME industrielles", prix: null },
  { id: "pro", nom: "Pro", instruments: 500, cible: "Sites structurés", prix: null },
  { id: "entreprise", nom: "Entreprise", instruments: 1000, cible: "Multi-sites, gros parc", prix: null },
  { id: "grandcompte", nom: "Grand Compte", instruments: 2000, cible: "Très grandes structures", prix: null },
  { id: "custom", nom: "Sur-mesure", instruments: null, cible: "Au-delà de 2 000 instruments, sur devis", prix: null },
];

export const TRIAL_DAYS = 30;
export const offerById = (id: string) => OFFERS.find((o) => o.id === id);
