// Saisie numérique tolérante (reprise de parseNumber de l'ancienne version) :
// accepte la virgule et le point décimal, ignore les espaces (y compris insécables et fins).
export function parseNumber(raw: string | number | null | undefined): number {
  if (raw == null) return NaN;
  if (typeof raw === "number") return raw;
  const cleaned = raw.trim().replace(/[\s  ]/g, "").replace(",", ".");
  return cleaned === "" ? NaN : Number(cleaned);
}

export function fmt(x: number | null | undefined, digits = 3): string {
  return x == null || !Number.isFinite(x) ? "—" : x.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
