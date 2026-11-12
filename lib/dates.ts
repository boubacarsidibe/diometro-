// Affichage des dates au format français jj/mm/aaaa, partout dans l'application.
// Les dates pures ("2026-11-12") sont découpées sans fuseau horaire : aucun décalage d'un jour possible.
// Les horodatages (created_at…) sont affichés à l'heure de Dakar.
export const TIME_ZONE = "Africa/Dakar";

const PURE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function fmtDate(value: string | null | undefined, empty = "—"): string {
  if (!value) return empty;
  const m = PURE_DATE.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleDateString("fr-FR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTime(value: string | null | undefined, empty = "—"): string {
  if (!value) return empty;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  const date = d.toLocaleDateString("fr-FR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}
