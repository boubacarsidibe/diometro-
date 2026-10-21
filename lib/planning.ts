const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export type MonthKey = string; // "YYYY-MM"

export function currentMonth(now: Date = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Accepte uniquement "YYYY-MM" valide ; sinon retombe sur le mois courant.
export function parseMonth(value: string | undefined, now: Date = new Date()): MonthKey {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 2000 ? value : currentMonth(now);
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: MonthKey): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Grille de semaines (lundi en premier) : numéros de jour, null pour les cases vides.
export function calendarGrid(key: MonthKey): (number | null)[][] {
  const [y, m] = key.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function groupByDay<T extends { date_prochaine: string | null }>(items: T[], key: MonthKey): Map<number, T[]> {
  const out = new Map<number, T[]>();
  for (const it of items) {
    if (!it.date_prochaine?.startsWith(`${key}-`)) continue;
    const day = Number(it.date_prochaine.slice(8, 10));
    out.set(day, [...(out.get(day) ?? []), it]);
  }
  return out;
}
