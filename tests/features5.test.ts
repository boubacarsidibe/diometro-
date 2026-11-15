import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { addDuration, describeFrequence } from "@/lib/status";
import { PAGE_SIZE, activeFilterCount, echeanceRange, instrumentHref, parseInstrumentQuery, sanitizeSearch } from "@/lib/instrumentQuery";
import { instrumentSchema, PLANS, registerSchema } from "@/lib/schemas";
import { OFFERS, TRIAL_DAYS } from "@/lib/plans";

describe("fréquence valeur + unité", () => {
  it("calcule la prochaine échéance pour chaque unité", () => {
    expect(addDuration("2026-03-10", 10, "jour")).toBe("2026-03-20");
    expect(addDuration("2026-03-10", 3, "semaine")).toBe("2026-03-31");
    expect(addDuration("2026-01-31", 1, "mois")).toBe("2026-02-28");
    expect(addDuration("2026-03-10", 6, "mois")).toBe("2026-09-10");
    expect(addDuration("2024-02-29", 1, "annee")).toBe("2025-02-28");
    expect(addDuration("2026-12-25", 10, "jour")).toBe("2027-01-04");
  });
  it("refuse les durées invalides", () => {
    expect(() => addDuration("2026-03-10", 0, "jour")).toThrow();
    expect(() => addDuration("2026-03-10", 1.5, "jour")).toThrow();
    expect(() => addDuration("pas-une-date", 1, "jour")).toThrow();
  });
  it("affiche la fréquence lisiblement", () => {
    expect(describeFrequence(12, "mois")).toBe("12 mois");
    expect(describeFrequence(2, "annee")).toBe("2 an(s)");
    expect(describeFrequence(null, null)).toBe("—");
  });
  it("le formulaire exige valeur ET unité, et le champ est vide par défaut", () => {
    const base = { ref: "R", designation: "D", type_mesure: "", batiment: "", zone: "", statut: "En service", date_etalonnage: "", date_prochaine: "", commentaires: "" };
    const ok = instrumentSchema.parse({ ...base, frequence_valeur: "", frequence_unite: "" });
    expect(ok.frequence_valeur).toBeNull();
    expect(ok.frequence_unite).toBeNull();
    expect(instrumentSchema.parse({ ...base, frequence_valeur: "6", frequence_unite: "semaine" })).toMatchObject({ frequence_valeur: 6, frequence_unite: "semaine" });
    expect(instrumentSchema.safeParse({ ...base, frequence_valeur: "6", frequence_unite: "" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, frequence_valeur: "", frequence_unite: "mois" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, frequence_valeur: "0", frequence_unite: "mois" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, frequence_valeur: "5", frequence_unite: "siècle" }).success).toBe(false);
  });
});

describe("liste des instruments : filtres, tri, pagination", () => {
  it("valide chaque paramètre d'adresse (liste blanche)", () => {
    const q = parseInstrumentQuery({ q: " thermo ", statut: "En service", conformite: "Oui", echeance: "15", sort: "date_prochaine", dir: "desc", page: "3", type: "pipette", batiment: "Bât. A", zone: "Z1" });
    expect(q).toMatchObject({ q: "thermo", statut: "En service", conformite: "Oui", echeance: "15", sort: "date_prochaine", dir: "desc", page: 3, type: "pipette", batiment: "Bât. A", zone: "Z1" });
    const bad = parseInstrumentQuery({ statut: "Inventé", conformite: "x", echeance: "999", sort: "password; drop table", dir: "up", page: "-4", type: "A B;--", q: "x".repeat(500) });
    expect(bad).toMatchObject({ statut: "", conformite: "", echeance: "", sort: "ref", dir: "asc", page: 1, type: "" });
    expect(bad.q).toHaveLength(100);
    expect(parseInstrumentQuery({ page: "abc" }).page).toBe(1);
    expect(parseInstrumentQuery({ page: "99999999999" }).page).toBe(100000);
    expect(parseInstrumentQuery({ statut: ["En service", "Réformé"] }).statut).toBe("En service");
  });
  it("l'adresse ne contient que les filtres actifs et se relit à l'identique", () => {
    expect(instrumentHref(parseInstrumentQuery({}))).toBe("/instruments");
    const q = parseInstrumentQuery({ statut: "En service", echeance: "30", sort: "designation", dir: "desc", page: "2" });
    const href = instrumentHref(q);
    expect(href).toBe("/instruments?statut=En+service&echeance=30&sort=designation&dir=desc&page=2");
    const again = parseInstrumentQuery(Object.fromEntries(new URL(href, "http://x").searchParams));
    expect(again).toEqual(q);
    expect(instrumentHref(q, { page: 1, sort: "ref", dir: "asc" })).toBe("/instruments?statut=En+service&echeance=30");
    expect(activeFilterCount(q)).toBe(2);
    expect(PAGE_SIZE).toBe(25);
  });
  it("nettoie la recherche (aucun caractère de la syntaxe de filtre)", () => {
    expect(sanitizeSearch('a,b),or(id.eq.1%_*"\'x')).toBe("a b or id.eq.1 x");
    expect(sanitizeSearch("  thermomètre   é  ")).toBe("thermomètre é");
    expect(sanitizeSearch("(),%")).toBe("");
  });
  it("bornes d'échéance : retard, sous 15 jours, sous 30 jours", () => {
    expect(echeanceRange("retard", "2026-11-10")).toEqual({ lt: "2026-11-10" });
    expect(echeanceRange("15", "2026-11-10")).toEqual({ gte: "2026-11-10", lte: "2026-11-24" });
    expect(echeanceRange("30", "2026-11-10")).toEqual({ gte: "2026-11-10", lte: "2026-12-10" });
  });
});

describe("inscription, essai et formules", () => {
  const base = { email: "a@b.sn", password: "Solide-Passe-2026" };
  it("la case des conditions est obligatoire", () => {
    expect(registerSchema.safeParse({ ...base }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, accept: "off" }).success).toBe(false);
    const r = registerSchema.safeParse({ ...base, accept: "on" });
    expect(r.success && r.data.formule).toBe("");
    expect(registerSchema.safeParse({ ...base, accept: "on", formule: "pro" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, accept: "on", formule: "gratuite" }).success).toBe(false);
  });
  it("pas de formule gratuite : essai de 30 jours uniquement, capacités alignées sur la base", () => {
    expect(TRIAL_DAYS).toBe(30);
    expect(OFFERS.map((o) => o.id)).not.toContain("essai");
    expect(OFFERS.map((o) => o.id)).toEqual(["starter", "standard", "pro", "entreprise", "grandcompte", "custom"]);
    for (const o of OFFERS) expect(o.instruments).toBe(PLANS.find((p) => p.id === o.id)!.instruments);
    // Prix HT en FCFA (14/11/2026) : sur devis seulement pour le sur-mesure, annuel = 10 mois.
    for (const o of OFFERS) {
      if (o.id === "custom") expect(o.prix).toBeNull();
      else expect(o.prix!.annuel).toBe(o.prix!.mensuel * 10);
    }
  });
});
