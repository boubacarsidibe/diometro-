import type { PLANS } from "@/lib/schemas";

type PlanId = (typeof PLANS)[number]["id"];

// Formules proposées. Capacités = limites d'instruments appliquées par la base (voir lib/schemas.ts PLANS).
// Prix hors taxes en FCFA, fixés le 14/11/2026. Annuel = 10 mois (2 mois offerts). `prix: null` affiche « sur devis ».
export type Offer = {
  id: Exclude<PlanId, "essai">; nom: string; instruments: number | null; cible: string;
  prix: { mensuel: number; annuel: number } | null; // en FCFA (XOF)
};

export const OFFERS: Offer[] = [
  { id: "starter", nom: "Starter", instruments: 50, cible: "Petits ateliers et laboratoires", prix: { mensuel: 15000, annuel: 150000 } },
  { id: "standard", nom: "Standard", instruments: 200, cible: "PME industrielles", prix: { mensuel: 30000, annuel: 300000 } },
  { id: "pro", nom: "Pro", instruments: 500, cible: "Sites structurés", prix: { mensuel: 55000, annuel: 550000 } },
  { id: "entreprise", nom: "Entreprise", instruments: 1000, cible: "Multi-sites, gros parc", prix: { mensuel: 90000, annuel: 900000 } },
  { id: "grandcompte", nom: "Grand Compte", instruments: 2000, cible: "Très grandes structures", prix: { mensuel: 150000, annuel: 1500000 } },
  { id: "custom", nom: "Sur-mesure", instruments: null, cible: "Au-delà de 2 000 instruments, sur devis", prix: null },
];

export const TRIAL_DAYS = 30;
export const offerById = (id: string) => OFFERS.find((o) => o.id === id);
