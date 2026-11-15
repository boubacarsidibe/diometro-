import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildAuditPdf } from "@/lib/export";
import { money } from "@/lib/money";
import { fmt, parseNumber } from "@/lib/calc/parse";
import { directSchema, pipetteSchema, pt100Schema } from "@/lib/calc/schemas";
import { instrumentSchema, onboardingSchema, platformTenantSchema, prestataireSchema, PLANS } from "@/lib/schemas";

const base = { ref: "R", designation: "D", type_mesure: "", batiment: "", zone: "", statut: "En service", date_etalonnage: "", date_prochaine: "", frequence_valeur: "", frequence_unite: "", commentaires: "" };

describe("saisies", () => {
  it("parseNumber accepte virgule, espaces fins et refuse le reste", () => {
    expect(parseNumber("4,200")).toBe(4.2);
    expect(parseNumber("10 000")).toBe(10000);
    expect(parseNumber("10 000,5")).toBe(10000.5);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
    expect(parseNumber(null)).toBeNaN();
    expect(fmt(1234.5678, 2)).toBe(Number(1234.57).toLocaleString("fr-FR", { minimumFractionDigits: 2 }));
    expect(fmt(NaN)).toBe("—");
  });
  it("devises : FCFA sans décimales", () => {
    expect(money(15000, "XOF")).toMatch(/15\s?000 FCFA/);
    expect(money(12.5, "EUR")).toMatch(/12,5 €/);
  });
  it("instrument : nouveaux champs validés, liens http(s) uniquement", () => {
    expect(instrumentSchema.safeParse({ ...base, conformite: "Oui", etalonnage_type: "Interne", fiche_link: "https://exemple.sn/f.pdf" }).success).toBe(true);
    expect(instrumentSchema.safeParse(base).success).toBe(true); // valeurs par défaut
    expect(instrumentSchema.safeParse({ ...base, fiche_link: "javascript:alert(1)" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, certificat_link: "data:text/html,x" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, conformite: "Peut-être" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, prestataire_id: "pas-un-uuid" }).success).toBe(false);
    const ok = instrumentSchema.parse({ ...base, prestataire_id: "" });
    expect(ok.prestataire_id).toBeNull();
  });
  it("inscription : bâtiments dédoublonnés et bornés", () => {
    const r = onboardingSchema.parse({ company: "Dioulatech", displayName: "Jula", sector: "", phone: "", buildings: "Atelier A\nAtelier A\n\nLabo \n" });
    expect(r.buildings).toEqual(["Atelier A", "Labo"]); // un bâtiment par ligne (liste)
    expect(onboardingSchema.parse({ company: "Dioulatech", displayName: "Jula", sector: "", phone: "", buildings: "Atelier A, Atelier A, Labo " }).buildings).toEqual(["Atelier A", "Labo"]); // ancien format à virgules
    expect(onboardingSchema.safeParse({ company: "X", displayName: "Jula", sector: "", phone: "", buildings: "" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ company: "Dioulatech", displayName: "Jula", sector: "", phone: "", buildings: Array.from({ length: 60 }, (_, i) => `B${i}`).join(",") }).success).toBe(false);
  });
  it("prestataire : grille de tarifs, tarif et devise", () => {
    const p = prestataireSchema.parse({ nom: "Labo", type: "Maintenance", domaines: "Pression, Température, Pression", ref_cofrac: "", adresse: "", telephone: "", email: "", site_web: "", contact_nom: "", contact_fonction: "", tarif_horaire: "15 000".replace(" ", ""), devise: "XOF", grille_tarifs: "Pression ; 25000 ; point\nTempérature ; 18 000,5 ; point".replace("18 000,5", "18000,5"), delai_moyen_jours: "", note_interne: "4", commentaires: "", cofrac: "on", actif: "on" });
    expect(p.domaines).toEqual(["Pression", "Température"]);
    expect(p.grille_tarifs).toEqual([{ typeMesure: "Pression", prix: 25000, unite: "point" }, { typeMesure: "Température", prix: 18000.5, unite: "point" }]);
    expect(p.tarif_horaire).toBe(15000);
    expect(p.cofrac).toBe(true);
    const bad = (o: object) => prestataireSchema.safeParse({ nom: "Labo", type: "Maintenance", domaines: "", ref_cofrac: "", adresse: "", telephone: "", email: "", site_web: "", contact_nom: "", contact_fonction: "", tarif_horaire: "", devise: "XOF", grille_tarifs: "", delai_moyen_jours: "", note_interne: "0", commentaires: "", ...o }).success;
    expect(bad({})).toBe(true);
    expect(bad({ grille_tarifs: "sans prix" })).toBe(false);
    expect(bad({ grille_tarifs: "A ; -5 ; h" })).toBe(false);
    expect(bad({ devise: "BTC" })).toBe(false);
    expect(bad({ site_web: "javascript:alert(1)" })).toBe(false);
    expect(bad({ email: "pas-un-email" })).toBe(false);
    expect(bad({ note_interne: "9" })).toBe(false);
  });
  it("formules : liste fermée, limite optionnelle", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["essai", "starter", "standard", "pro", "entreprise", "grandcompte", "custom"]);
    const t = "00000000-0000-4000-8000-000000000001";
    expect(platformTenantSchema.parse({ tenant_id: t, status: "active", plan: "pro", max_instruments: "", expires: "" })).toMatchObject({ max_instruments: null, expires: null });
    expect(platformTenantSchema.parse({ tenant_id: t, status: "blocked", plan: "standard", max_instruments: "200", expires: "2027-01-31" }).max_instruments).toBe(200);
    expect(platformTenantSchema.safeParse({ tenant_id: t, status: "active", plan: "premium", max_instruments: "", expires: "" }).success).toBe(false);
    expect(platformTenantSchema.safeParse({ tenant_id: t, status: "active", plan: "pro", max_instruments: "-3", expires: "" }).success).toBe(false);
  });
  it("calculateurs : le serveur borne toutes les entrées", () => {
    const pip = { vnom: 10, ta: 21, p: 1009, te: 20.5, tv: 21, alpha: 5e-6, emt: 0.8, resBal: 0.001, resTh: 0.2, resBaro: 1, h: null, useHumidite: false, masses: [9.98, 9.99] };
    expect(pipetteSchema.safeParse(pip).success).toBe(true);
    expect(pipetteSchema.safeParse({ ...pip, masses: [9.98] }).success).toBe(false);
    expect(pipetteSchema.safeParse({ ...pip, masses: Array(21).fill(10) }).success).toBe(false);
    expect(pipetteSchema.safeParse({ ...pip, vnom: 0 }).success).toBe(false);
    expect(pipetteSchema.safeParse({ ...pip, p: Infinity }).success).toBe(false);
    expect(pipetteSchema.safeParse({ ...pip, ta: NaN }).success).toBe(false);
    const pt = { a: 0, b: 1, c: 0, emt: 1, resLue: 0, resEt: 0, uEt: 0, uDerive: 0, uHomog: 0, modeRig: true, points: [{ cons: 20, vref: [20, 20.1], vlue: [20, 20.2] }] };
    expect(pt100Schema.safeParse(pt).success).toBe(true);
    expect(pt100Schema.safeParse({ ...pt, points: [] }).success).toBe(false);
    expect(pt100Schema.safeParse({ ...pt, points: Array(11).fill(pt.points[0]) }).success).toBe(false);
    expect(pt100Schema.safeParse({ ...pt, points: [{ cons: 20, vref: Array(21).fill(1), vlue: [1] }] }).success).toBe(false);
    expect(directSchema.safeParse({ emt: 0.1, points: [{ ref: 1, lue: 1.01 }] }).success).toBe(true);
    expect(directSchema.safeParse({ emt: 0.1, points: Array(21).fill({ ref: 1, lue: 1 }) }).success).toBe(false);
    expect(directSchema.safeParse({ emt: 0, points: [{ ref: 1, lue: 1 }] }).success).toBe(false);
    expect(directSchema.safeParse({ emt: "1", points: [{ ref: 1, lue: 1 }] }).success).toBe(false);
  });
  it("export PDF d'audit : multi-pages et caractères spéciaux", async () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({ created_at: "2026-10-21T08:56:16.38+00:00", user: i % 2 ? "Jula ✓" : "Système", action: "insert", entity: "instruments", entity_id: `id-${i}-aaaaaaaaaaaaaaaa` }));
    const pdf = await PDFDocument.load(await buildAuditPdf(rows, "Dioulatech ✓", new Date(2026, 9, 22)));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
