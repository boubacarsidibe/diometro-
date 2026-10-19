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

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  expire: "Expiré",
  urgent: "Urgent",
  bientot: "Bientôt",
  ok: "À jour",
  none: "Non planifié",
};
