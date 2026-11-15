import { describe, expect, it } from "vitest";
import { devisLines, parseDevis } from "@/lib/devis";
import { quoteRequestEmail } from "@/lib/email-template";

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
};
const ok = { entreprise: "Atelier Démo", secteur: "Agroalimentaire", nom: "Awa Ndiaye", email: "Awa@Exemple.sn", taille: "50 à 200", consent: "on" };

describe("fiche de devis", () => {
  it("accepte une demande complète et normalise l'e-mail", () => {
    const r = parseDevis(fd({ ...ok, familles: ["Balances et masses", "inventée"], sites: "2 sites" }));
    expect(r.data?.email).toBe("awa@exemple.sn");
    expect(r.data?.familles).toEqual(["Balances et masses"]);
    expect(r.data?.sites).toBe("2");
  });
  it("refuse les champs obligatoires manquants et les valeurs hors liste", () => {
    const r = parseDevis(fd({ entreprise: "A", secteur: "Pirate", nom: "", email: "pas-un-mail", taille: "énorme" }));
    expect(r.data).toBeUndefined();
    expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "entreprise", "nom", "secteur", "taille"]);
  });
  it("produit un e-mail échappé, sans retour à la ligne dans l'objet", () => {
    const r = parseDevis(fd({ ...ok, entreprise: "<b>Evil</b>\nCo", message: "<script>x</script>" }));
    const m = quoteRequestEmail(devisLines(r.data!), r.data!.entreprise, "https://diometro.vercel.app");
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;b&gt;Evil");
  });
});
