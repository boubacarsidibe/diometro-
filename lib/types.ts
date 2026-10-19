export type Instrument = {
  id: string; ref: string; designation: string; type_mesure: string; batiment: string; zone: string;
  statut: string; date_etalonnage: string | null; date_prochaine: string | null; frequence_mois: number | null;
  commentaires: string; deleted_at: string | null; created_at: string; updated_at: string;
};
export type Intervention = {
  id: string; instrument_id: string; date: string; type: string; resultat: string;
  prestataire: string; ref_certificat: string; observation: string; created_at: string;
};
