// Affichage des dates au format français jj/mm/aaaa, partout dans l'application.
// Les dates pures ("2026-11-12") sont découpées sans fuseau horaire : aucun décalage d'un jour possible.
// Les horodatages (created_at…) sont affichés dans le fuseau de l'entreprise (Paramètres), Dakar par défaut.
export const DEFAULT_TIME_ZONE = "Africa/Dakar";
/** @deprecated utiliser le fuseau de l'entreprise (session.timeZone) ; conservé pour les écrans hors entreprise. */
export const TIME_ZONE = DEFAULT_TIME_ZONE;

const PURE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
const zone = (tz?: string | null) => (isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE);

export function fmtDate(value: string | null | undefined, empty = "—", tz?: string | null): string {
  if (!value) return empty;
  const m = PURE_DATE.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleDateString("fr-FR", { timeZone: zone(tz), day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(value: string | null | undefined, empty = "—", tz?: string | null): string {
  if (!value) return empty;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  const date = d.toLocaleDateString("fr-FR", { timeZone: zone(tz), day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: zone(tz), hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

/** Date du jour (aaaa-mm-jj) dans le fuseau de l'entreprise. */
export function todayIn(tz?: string | null, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone(tz), year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** « Maintenant » ramené au jour de l'entreprise : à passer aux calculs d'échéance (jours restants, lundi des relances). */
export function zonedNow(tz?: string | null, now: Date = new Date()): Date {
  const [y, m, d] = todayIn(tz, now).split("-").map(Number);
  return new Date(y, m - 1, d, 12); // midi local du serveur : même jour calendaire, sans risque de bascule
}

/** Libellé court du fuseau, pour les en-têtes (« heure de Dakar », « heure de Paris »…). */
export function zoneLabel(tz?: string | null): string {
  const z = zone(tz);
  if (z === "UTC") return "UTC";
  return `heure de ${z.split("/").pop()!.replace(/_/g, " ")}`;
}
