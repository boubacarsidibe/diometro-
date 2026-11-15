// Traduit une ligne du journal d'audit (écrite par les triggers de la base) en français lisible :
// action nommée (création, modification, archivage, restauration…), objet concerné et champs modifiés.
import { fmtDate, fmtDateTime } from "@/lib/dates";

type Json = Record<string, unknown>;
export type AuditRow = { id: number; user_id: string | null; action: string; entity: string; entity_id: string; created_at: string; detail: Json | null };
export type AuditChange = { field: string; before: string; after: string };
export type AuditView = { label: string; object: string; changes: AuditChange[] };

const ENTITY: Record<string, { noun: string; article: string }> = {
  instruments: { noun: "instrument", article: "de l'" },
  interventions: { noun: "intervention", article: "de l'" },
  prestataires: { noun: "prestataire", article: "du " },
  profiles: { noun: "utilisateur", article: "de l'" },
  inventory_runs: { noun: "inventaire", article: "de l'" },
  attachments: { noun: "pièce jointe", article: "de la " },
  tenants: { noun: "entreprise", article: "de l'" },
};

const FIELD: Record<string, string> = {
  ref: "Référence", designation: "Désignation", type_mesure: "Type de mesure", statut: "Statut", batiment: "Bâtiment", zone: "Zone",
  date_etalonnage: "Dernier étalonnage", date_prochaine: "Prochaine échéance", frequence_valeur: "Fréquence", frequence_unite: "Unité de fréquence",
  frequence_mois: "Fréquence (mois)", conformite: "Conformité", tolerance: "Tolérance / EMT", graduation: "Graduation / résolution",
  proprietaire: "Propriétaire / responsable", lieu_stockage: "Lieu de stockage", etalonnage_type: "Type d'étalonnage", mode_utilisation: "Mode d'utilisation",
  prestataire_id: "Prestataire habituel", origine_frequence: "Origine de la fréquence", raccordement: "Raccordement", commentaires: "Commentaires",
  catalog_id: "Type d'instrument", public_token: "Lien QR public", deleted_at: "Archivage", fiche_link: "Lien fiche", certificat_link: "Lien certificat",
  date: "Date", type: "Type", resultat: "Résultat", prestataire: "Prestataire", ref_certificat: "Réf. certificat", observation: "Observation", mode: "Mode",
  nom: "Nom", contact: "Contact", telephone: "Téléphone", email: "E-mail", adresse: "Adresse", domaines: "Domaines", tarif_horaire: "Tarif horaire",
  delai_moyen: "Délai moyen", note: "Note", actif: "Actif", accredite: "Accrédité",
  display_name: "Nom affiché", role: "Rôle", active: "Accès", phone: "Téléphone", mfa_method: "Méthode de connexion",
  closed_at: "Clôture", found_count: "Retrouvés", total_count: "Total", filename: "Fichier", kind: "Type de document",
};
// Champs techniques jamais affichés.
const HIDDEN = new Set(["id", "tenant_id", "created_at", "updated_at", "created_by", "realise_par", "calcul", "calcul_type", "instrument_id", "user_id", "size_bytes", "mime", "storage_path", "logo_data"]);
const ROLE: Record<string, string> = { admin: "Administrateur", responsable: "Coordinateur", consultation: "Consultation" };

function show(field: string, v: unknown, tz?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "public_token") return "actif";
  if (field === "role") return ROLE[String(v)] ?? String(v);
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return fmtDate(v);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmtDateTime(v, "—", tz);
  if (Array.isArray(v)) return v.join(", ") || "—";
  if (typeof v === "object") return "…";
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

function objectName(entity: string, d: Json | null | undefined, tz?: string): string {
  if (!d) return "";
  const pick = (k: string) => (typeof d[k] === "string" && d[k] ? String(d[k]) : "");
  if (entity === "instruments") return [pick("ref"), pick("designation")].filter(Boolean).join(" — ");
  if (entity === "interventions") return [pick("type"), d.date ? `du ${show("date", d.date)}` : ""].filter(Boolean).join(" ");
  if (entity === "prestataires") return pick("nom");
  if (entity === "profiles") return pick("display_name");
  if (entity === "attachments") return pick("filename");
  if (entity === "inventory_runs") return d.created_at ? `du ${show("created_at", d.created_at, tz).slice(0, 10)}` : "";
  return pick("name") || pick("nom");
}

export function describeAudit(r: AuditRow, tz?: string): AuditView {
  const e = ENTITY[r.entity] ?? { noun: r.entity, article: "de " };
  const before = (r.detail?.before ?? null) as Json | null;
  const after = (r.detail?.after ?? null) as Json | null;
  const current = (r.action === "update" ? after : r.detail) as Json | null;
  const object = objectName(r.entity, current, tz) || r.entity_id.slice(0, 8);

  if (r.action === "platform_update") return { label: "Modification par l'administrateur de la plateforme", object, changes: [] };
  if (r.action === "insert") return { label: `Création ${e.article}${e.noun}`, object, changes: [] };
  if (r.action === "delete") return { label: `Suppression ${e.article}${e.noun}`, object, changes: [] };
  if (r.action !== "update" || !before || !after) return { label: `${r.action} ${e.article}${e.noun}`, object, changes: [] };

  const keys = Object.keys(after).filter((k) => !HIDDEN.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  if (keys.includes("deleted_at")) {
    return { label: after.deleted_at ? `Archivage ${e.article}${e.noun}` : `Restauration ${e.article}${e.noun}`, object, changes: [] };
  }
  if (r.entity === "inventory_runs" && keys.includes("closed_at") && after.closed_at) {
    return { label: "Clôture de l'inventaire", object, changes: [{ field: "Retrouvés", before: "", after: `${show("", after.found_count)} / ${show("", after.total_count)}` }] };
  }
  const changes = keys.map((k) => ({ field: FIELD[k] ?? k, before: show(k, before[k], tz), after: show(k, after[k], tz) }));
  return { label: `Modification ${e.article}${e.noun}`, object, changes };
}

export const auditUser = (userId: string | null, names: Map<string, string>) =>
  userId ? names.get(userId) ?? "Utilisateur supprimé" : "Mise à jour automatique";
