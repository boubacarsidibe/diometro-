// Calculs de la console plateforme (fonctions pures, testées dans tests/console.test.ts).
import { offerById } from "@/lib/plans";

export type ConsoleTenant = {
  id: string; name: string; status: string; plan: string; plan_expires_at: string | null; created_at: string;
  users: number; instruments: number; max_instruments: number | null; sector: string;
  admin_email: string | null; last_sign_in_at: string | null;
};

export type TenantState = "active" | "expired" | "blocked";

const DAY = 86_400_000;
const toDay = (iso: string) => Date.parse(iso.slice(0, 10) + "T12:00:00Z");

/** Jours entre aujourd'hui (AAAA-MM-JJ) et une date ; négatif si passée. */
export function daysUntil(date: string, today: string): number {
  return Math.round((toDay(date) - toDay(today)) / DAY);
}

/** Jours écoulés depuis la dernière connexion (null si jamais connecté ou donnée absente). */
export function daysSince(ts: string | null, today: string): number | null {
  if (!ts) return null;
  return Math.max(0, Math.round((toDay(today) - toDay(ts)) / DAY));
}

export function stateOf(t: ConsoleTenant, today: string): TenantState {
  if (t.status === "blocked") return "blocked";
  if (t.plan_expires_at && daysUntil(t.plan_expires_at, today) < 0) return "expired";
  return "active";
}

/** Revenu mensuel estimé d'une entreprise : prix mensuel de sa formule si elle est active et payante, sinon 0. */
export function monthlyRevenue(t: ConsoleTenant, today: string): number {
  if (t.plan === "essai" || stateOf(t, today) !== "active") return 0;
  return offerById(t.plan)?.prix?.mensuel ?? 0;
}

export type FollowUp = { tenant: ConsoleTenant; reason: string };

/** Entreprises à relancer, avec la raison la plus importante pour chacune. */
export function followUps(list: ConsoleTenant[], today: string): FollowUp[] {
  const out: FollowUp[] = [];
  for (const t of list) {
    const st = stateOf(t, today);
    if (st === "blocked") continue;
    const left = t.plan_expires_at ? daysUntil(t.plan_expires_at, today) : null;
    const idle = daysSince(t.last_sign_in_at, today);
    if (st === "expired") out.push({ tenant: t, reason: t.plan === "essai" ? "Essai terminé" : "Abonnement expiré" });
    else if (t.max_instruments != null && t.instruments > t.max_instruments) out.push({ tenant: t, reason: "Limite d'instruments dépassée" });
    else if (left !== null && left <= 10) out.push({ tenant: t, reason: `${t.plan === "essai" ? "Essai" : "Abonnement"} fini dans ${left} j` });
    else if (idle !== null && idle >= 7) out.push({ tenant: t, reason: `Aucune connexion depuis ${idle} j` });
  }
  return out;
}

/** Inscriptions par mois sur les 12 derniers mois (le dernier = mois en cours). */
export function signupsByMonth(list: ConsoleTenant[], today: string): { label: string; count: number }[] {
  const [y, m] = today.split("-").map(Number);
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");
    months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), count: 0 });
  }
  for (const t of list) {
    const row = months.find((x) => x.key === t.created_at.slice(0, 7));
    if (row) row.count++;
  }
  return months.map(({ label, count }) => ({ label, count }));
}

/** Conversion essai vers payant : parmi les entreprises inscrites depuis plus de 30 jours, part passée à une formule payante. */
export function conversion(list: ConsoleTenant[], today: string, trialDays = 30): { eligible: number; converted: number; rate: number | null } {
  const eligible = list.filter((t) => daysUntil(t.created_at, today) <= -trialDays);
  const converted = eligible.filter((t) => t.plan !== "essai").length;
  return { eligible: eligible.length, converted, rate: eligible.length ? converted / eligible.length : null };
}

export const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
