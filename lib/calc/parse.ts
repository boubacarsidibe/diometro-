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

// EMT reprise du champ « Tolérance / EMT » de la fiche (ex. « ± 0,5 °C », « +/- 2 % ») : premier nombre trouvé, virgule française.
export function emtFromTolerance(tolerance: string | null | undefined): string {
  const m = /(\d+(?:[.,]\d+)?)/.exec(tolerance ?? "");
  return m ? m[1].replace(".", ",") : "";
}
