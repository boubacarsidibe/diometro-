export type Instrument = {
  id: string; ref: string; designation: string; type_mesure: string; batiment: string; zone: string;
  statut: string; date_etalonnage: string | null; date_prochaine: string | null; frequence_mois: number | null;
  commentaires: string; deleted_at: string | null; created_at: string; updated_at: string;
};
export type Intervention = {
  id: string; instrument_id: string; date: string; type: string; resultat: string;
  prestataire: string; ref_certificat: string; observation: string; created_at: string;
};

export type Prestataire = {
  id: string; nom: string; type: string; domaines: string[]; cofrac: boolean; ref_cofrac: string; adresse: string;
  telephone: string; email: string; site_web: string; contact_nom: string; contact_fonction: string;
  delai_moyen_jours: number | null; note_interne: number; actif: boolean; commentaires: string; deleted_at: string | null;
};
export type Attachment = { id: string; kind: string; filename: string; mime: string; size_bytes: number; created_at: string };
