export type Urgency = "expire" | "urgent" | "bientot" | "ok" | "none";

const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  if (Number.isNaN(target)) return null;
  return Math.round((target - startOfDay(now)) / DAY);
}

// Mêmes seuils que l'ancienne version : <0 expiré, <15 j urgent, <=30 j bientôt.
export function urgencyOf(iso: string | null | undefined, now: Date = new Date()): Urgency {
  const days = daysUntil(iso, now);
  if (days === null) return "none";
  if (days < 0) return "expire";
  if (days < 15) return "urgent";
  if (days <= 30) return "bientot";
  return "ok";
}

// Incohérence : déclaré conforme alors que l'échéance d'étalonnage est dépassée.
export function conformityWarning(conformite: string | null | undefined, dateProchaine: string | null | undefined, now: Date = new Date()): string | null {
  return conformite === "Oui" && urgencyOf(dateProchaine, now) === "expire"
    ? "Échéance d'étalonnage dépassée : la conformité « Oui » n'est plus garantie tant que l'instrument n'est pas réétalonné."
    : null;
}

// Échéance très ancienne (plus d'un an) sans dernier étalonnage saisi : probable erreur de saisie.
export function staleDeadlineWarning(dateProchaine: string | null | undefined, dateEtalonnage: string | null | undefined, now: Date = new Date()): string | null {
  const days = daysUntil(dateProchaine, now);
  return days !== null && days < -365 && !dateEtalonnage
    ? `Cette échéance date de plus d'un an (${-days} jours de retard) et aucun dernier étalonnage n'est saisi : vérifiez la date.`
    : null;
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export type FrequenceUnite = "jour" | "semaine" | "mois" | "annee";
export const UNITE_LABEL: Record<FrequenceUnite, string> = { jour: "jour(s)", semaine: "semaine(s)", mois: "mois", annee: "an(s)" };

// dernier étalonnage + fréquence = prochaine échéance (fin de mois respectée pour mois/années).
export function addDuration(iso: string, value: number, unit: FrequenceUnite): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isInteger(value) || value < 1) throw new Error("durée invalide");
  if (unit === "mois") return addMonths(iso, value);
  if (unit === "annee") return addMonths(iso, value * 12);
  const [y, m, d] = iso.split("-").map(Number);
  const days = unit === "semaine" ? value * 7 : value;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function describeFrequence(value: number | null | undefined, unit: string | null | undefined): string {
  return value && unit ? `${value} ${UNITE_LABEL[unit as FrequenceUnite] ?? unit}` : "—";
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  expire: "Expiré",
  urgent: "Urgent",
  bientot: "Bientôt",
  ok: "À jour",
  none: "Non planifié",
};
