import type { Prestataire } from "@/lib/types";

// Domaine de mesure de chaque type du catalogue, pour rapprocher un instrument des domaines déclarés par les prestataires.
const DOMAINE_OF: Record<string, string[]> = {
  pipette: ["volume", "volumetrie", "masse"], balance: ["masse", "pesage"],
  pied_coulisse: ["dimensionnel", "longueur"], micrometre: ["dimensionnel", "longueur"], circometre: ["dimensionnel", "longueur"],
  controleur_epaisseur: ["dimensionnel", "epaisseur"], comparateur_cadran: ["dimensionnel", "longueur"],
  thermometre: ["temperature", "thermique"], hygrometre: ["humidite", "hygrometrie", "temperature"],
  manometre: ["pression"], manometre_vide: ["pression", "vide"], barometre: ["pression"],
  multimetre: ["electrique", "electricite"], pince_amperemetrique: ["electrique", "electricite"], megohmmetre: ["electrique", "electricite"],
  telluometre: ["electrique", "electricite"], oscilloscope: ["electrique", "electricite", "temps", "frequence"],
  durometre: ["durete", "mecanique"], cle_dynamometrique: ["couple", "force", "mecanique"],
  anemometre: ["vitesse", "debit", "aeraulique"], debitmetre: ["debit"], tachymetre: ["vitesse", "rotation", "temps"],
  chronometre: ["temps", "frequence"], ph_metre: ["chimie", "ph"], conductivimetre: ["chimie", "conductivite"],
  luxmetre: ["optique", "photometrie", "lumiere"], sonometre: ["acoustique", "son"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type Suggestion = { id: string; nom: string; score: number; raisons: string[]; contact: string };

/**
 * Prestataires les plus adaptés à un instrument (repris de la version locale : suggestPrestataires).
 * Critères : domaine de mesure (indispensable), accréditation, type « Étalonnage externe », note interne, délai moyen.
 */
export function suggestPrestataires(
  instrument: { type_mesure: string | null; catalog_id: string | null },
  prestataires: Prestataire[], accreditationLabel: string, max = 3,
): Suggestion[] {
  const cles = new Set<string>([...(DOMAINE_OF[instrument.catalog_id ?? ""] ?? [])]);
  const typeMesure = norm(instrument.type_mesure ?? "");
  if (typeMesure) typeMesure.split(/[\s,/;-]+/).filter((w) => w.length > 3).forEach((w) => cles.add(w));
  if (!cles.size) return [];

  return prestataires
    .filter((p) => p.actif && !p.deleted_at)
    .map((p) => {
      const domaines = p.domaines.map(norm);
      const match = domaines.find((d) => d.length > 2 && [...cles].some((k) => d.includes(k) || k.includes(d)));
      if (!match) return null;
      let score = 5;
      const raisons = [`Domaine : ${p.domaines[domaines.indexOf(match)]}`];
      if (p.cofrac) { score += 3; raisons.push(`${accreditationLabel}${p.ref_cofrac ? ` (${p.ref_cofrac})` : ""}`); }
      if (p.type === "Étalonnage externe") score += 1;
      if (p.note_interne > 0) { score += p.note_interne * 0.6; raisons.push(`Note ${p.note_interne}/5`); }
      if (p.delai_moyen_jours != null) { score += p.delai_moyen_jours <= 10 ? 1 : 0; raisons.push(`Délai moyen ${p.delai_moyen_jours} j`); }
      const tarif = (p.grille_tarifs ?? []).find((t) => [...cles].some((k) => norm(t.typeMesure).includes(k)));
      if (tarif) raisons.push(`Tarif ${tarif.prix.toLocaleString("fr-FR")} ${p.devise}${tarif.unite ? ` / ${tarif.unite}` : ""}`);
      return { id: p.id, nom: p.nom, score, raisons, contact: [p.contact_nom, p.telephone, p.email].filter(Boolean).join(" · ") };
    })
    .filter((x): x is Suggestion => x !== null)
    .sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom, "fr"))
    .slice(0, max);
}
