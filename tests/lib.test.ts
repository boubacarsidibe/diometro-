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
