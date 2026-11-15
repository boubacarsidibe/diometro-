import { describe, expect, it } from "vitest";
import { addMonths, daysUntil, urgencyOf } from "@/lib/status";
import { instrumentSchema, passwordSchema, registerSchema } from "@/lib/schemas";

const now = new Date(2026, 9, 19);

describe("statut d'échéance", () => {
  it("applique les seuils historiques", () => {
    expect(urgencyOf("2026-10-18", now)).toBe("expire");
    expect(urgencyOf("2026-10-19", now)).toBe("urgent");
    expect(urgencyOf("2026-11-02", now)).toBe("urgent");
    expect(urgencyOf("2026-11-03", now)).toBe("bientot");
    expect(urgencyOf("2026-11-18", now)).toBe("bientot");
    expect(urgencyOf("2026-11-19", now)).toBe("ok");
    expect(urgencyOf(null, now)).toBe("none");
    expect(urgencyOf("n'importe quoi", now)).toBe("none");
    expect(daysUntil("2026-10-20", now)).toBe(1);
  });
  it("calcule la prochaine échéance en fin de mois", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-10-19", 12)).toBe("2027-10-19");
  });
});

describe("validation", () => {
  it("refuse un mot de passe faible", () => {
    expect(passwordSchema.safeParse("court").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1234").success).toBe(false);
    expect(passwordSchema.safeParse("Solide-Passe-2026").success).toBe(true);
    expect(registerSchema.safeParse({ email: "x", password: "Solide-Passe-2026" }).success).toBe(false);
  });
  it("valide un instrument et refuse les dates incohérentes", () => {
    const base = {
      ref: "TH-01", designation: "Thermomètre", type_mesure: "", batiment: "", zone: "",
      statut: "En service", date_etalonnage: "2026-05-01", date_prochaine: "2027-05-01",
      frequence_valeur: "12", frequence_unite: "mois", commentaires: "",
    };
    expect(instrumentSchema.safeParse(base).success).toBe(true);
    expect(instrumentSchema.safeParse({ ...base, date_prochaine: "2026-01-01" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, statut: "Inconnu" }).success).toBe(false);
    expect(instrumentSchema.safeParse({ ...base, frequence_valeur: "0", frequence_unite: "mois" }).success).toBe(false);
  });
});

import { fmtDateTime, isValidTimeZone, todayIn, zonedNow, zoneLabel } from "@/lib/dates";
describe("fuseau horaire de l'entreprise", () => {
  it("affiche l'heure dans le fuseau choisi, Dakar par défaut", () => {
    const t = "2026-07-14T22:30:00Z";
    expect(fmtDateTime(t)).toBe("14/07/2026 22:30");
    expect(fmtDateTime(t, "—", "Europe/Paris")).toBe("15/07/2026 00:30"); // heure d'été
    expect(fmtDateTime(t, "—", "Africa/Lagos")).toBe("14/07/2026 23:30");
    expect(fmtDateTime(t, "—", "Pas/UnFuseau")).toBe("14/07/2026 22:30"); // invalide : Dakar
  });
  it("jour courant et « maintenant » ramenés au fuseau", () => {
    const instant = new Date("2026-12-31T23:30:00Z");
    expect(todayIn("Africa/Dakar", instant)).toBe("2026-12-31");
    expect(todayIn("Europe/Paris", instant)).toBe("2027-01-01");
    const n = zonedNow("Europe/Paris", instant);
    expect([n.getFullYear(), n.getMonth(), n.getDate()]).toEqual([2027, 0, 1]);
    expect(isValidTimeZone("America/Toronto")).toBe(true);
    expect(isValidTimeZone("x")).toBe(false);
    expect(zoneLabel("Europe/Paris")).toBe("heure de Paris");
  });
});
