const SUFFIX: Record<string, string> = { XOF: "FCFA", EUR: "€", USD: "$" };

export function money(value: number, currency = "XOF"): string {
  const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: currency === "XOF" ? 0 : 2 }).format(value);
  return `${n} ${SUFFIX[currency] ?? currency}`;
}
