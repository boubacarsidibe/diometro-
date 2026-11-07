import { CONFORMITES, STATUTS } from "@/lib/schemas";
import { addDuration } from "@/lib/status";

export const PAGE_SIZE = 25;
export const SORT_COLUMNS = ["ref", "designation", "batiment", "statut", "conformite", "date_prochaine"] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];
export const ECHEANCES = ["retard", "15", "30"] as const;
export type Echeance = (typeof ECHEANCES)[number];
export const ECHEANCE_LABEL: Record<Echeance, string> = { retard: "En retard", "15": "Sous 15 jours", "30": "Sous 30 jours" };

export type InstrumentQuery = {
  q: string; statut: string; conformite: string; batiment: string; zone: string; type: string;
  echeance: "" | Echeance; sort: SortColumn; dir: "asc" | "desc"; page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const text = (v: string, max: number) => v.trim().slice(0, max);

// Tout paramètre d'adresse est validé : liste blanche pour les valeurs fermées, longueur bornée pour le reste.
export function parseInstrumentQuery(sp: Params): InstrumentQuery {
  const statut = one(sp.statut);
  const conformite = one(sp.conformite);
  const echeance = one(sp.echeance);
  const sort = one(sp.sort);
  const type = one(sp.type);
  return {
    q: text(one(sp.q), 100),
    statut: (STATUTS as readonly string[]).includes(statut) ? statut : "",
    conformite: (CONFORMITES as readonly string[]).includes(conformite) ? conformite : "",
    batiment: text(one(sp.batiment), 100),
    zone: text(one(sp.zone), 100),
    type: /^[a-z0-9_]{1,60}$/.test(type) ? type : "",
    echeance: (ECHEANCES as readonly string[]).includes(echeance) ? (echeance as Echeance) : "",
    sort: (SORT_COLUMNS as readonly string[]).includes(sort) ? (sort as SortColumn) : "ref",
    dir: one(sp.dir) === "desc" ? "desc" : "asc",
    page: Math.min(100000, Math.max(1, Math.floor(Number(one(sp.page))) || 1)),
  };
}

// Adresse partageable : seuls les paramètres différents des valeurs par défaut y figurent.
export function instrumentHref(q: InstrumentQuery, patch: Partial<InstrumentQuery> = {}, base = "/instruments"): string {
  const m = { ...q, ...patch };
  const sp = new URLSearchParams();
  for (const k of ["q", "statut", "conformite", "batiment", "zone", "type", "echeance"] as const) if (m[k]) sp.set(k, m[k]);
  if (m.sort !== "ref" || m.dir !== "asc") { sp.set("sort", m.sort); sp.set("dir", m.dir); }
  if (m.page > 1) sp.set("page", String(m.page));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

// Retire les caractères réservés de la syntaxe de filtre (virgules, parenthèses, jokers) avant un « ilike ».
export function sanitizeSearch(term: string): string {
  return term.replace(/[,()%_*\\"'`:;]/g, " ").replace(/\s+/g, " ").trim();
}

// Bornes de date (incluses) pour le filtre d'échéance ; today = date du jour au format AAAA-MM-JJ.
export function echeanceRange(e: Echeance, today: string): { lt?: string; gte?: string; lte?: string } {
  if (e === "retard") return { lt: today };
  return { gte: today, lte: addDuration(today, e === "15" ? 14 : 30, "jour") };
}

export const activeFilterCount = (q: InstrumentQuery) => [q.q, q.statut, q.conformite, q.batiment, q.zone, q.type, q.echeance].filter(Boolean).length;
