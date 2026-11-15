// Pays du monde et leurs fuseaux horaires (base IANA tzdata, fichier zone.tab ; noms des pays en français).
// Fichier de données régénérable : node scripts/pays-fuseaux.mjs
import data from "@/lib/data/pays-fuseaux.json";

export type Country = { code: string; name: string; zones: { id: string; city: string }[] };
export const COUNTRIES = data as Country[];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export const countryByCode = (code: string | null | undefined) => (code ? BY_CODE.get(code.toUpperCase()) : undefined);

/** Pays d'un fuseau (premier trouvé), pour pré-remplir le choix à partir du navigateur ou d'un fuseau déjà enregistré. */
export function countryOfZone(tz: string | null | undefined): Country | undefined {
  if (!tz) return undefined;
  return COUNTRIES.find((c) => c.zones.some((z) => z.id === tz));
}

/** Le fuseau appartient-il bien au pays choisi ? */
export const isZoneOfCountry = (code: string, tz: string) => Boolean(countryByCode(code)?.zones.some((z) => z.id === tz));

/** Décalage actuel par rapport à GMT, ex. « GMT+1 », « GMT-4:30 » (tient compte de l'heure d'été). */
export function gmtOffset(tz: string, now: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName");
    const v = part?.value ?? "";
    return v === "GMT+0" || v === "UTC" ? "GMT" : v;
  } catch {
    return "";
  }
}
