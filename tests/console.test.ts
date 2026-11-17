import { describe, expect, it } from "vitest";
import { conversion, daysSince, daysUntil, followUps, monthlyRevenue, signupsByMonth, stateOf, type ConsoleTenant } from "@/lib/console";

const T = (o: Partial<ConsoleTenant>): ConsoleTenant => ({
  id: "x", name: "Démo", status: "active", plan: "essai", plan_expires_at: null, created_at: "2026-11-01T10:00:00Z",
  users: 1, instruments: 10, max_instruments: 50, sector: "", admin_email: null, last_sign_in_at: null, ...o,
});
const today = "2026-11-17";

describe("console plateforme", () => {
  it("compte les jours avant une échéance et depuis une connexion", () => {
    expect(daysUntil("2026-11-27", today)).toBe(10);
    expect(daysUntil("2026-11-01", today)).toBe(-16);
    expect(daysSince("2026-11-10T22:00:00Z", today)).toBe(7);
    expect(daysSince(null, today)).toBeNull();
  });

  it("distingue entreprise active, expirée et bloquée", () => {
    expect(stateOf(T({ plan_expires_at: "2026-12-01" }), today)).toBe("active");
    expect(stateOf(T({ plan_expires_at: "2026-11-16" }), today)).toBe("expired");
    expect(stateOf(T({ status: "blocked", plan_expires_at: "2027-01-01" }), today)).toBe("blocked");
  });

  it("ne compte un revenu que pour une formule payante active", () => {
    expect(monthlyRevenue(T({ plan: "standard", plan_expires_at: "2027-01-01" }), today)).toBe(30000);
    expect(monthlyRevenue(T({ plan: "essai" }), today)).toBe(0);
    expect(monthlyRevenue(T({ plan: "pro", plan_expires_at: "2026-11-01" }), today)).toBe(0);
    expect(monthlyRevenue(T({ plan: "custom" }), today)).toBe(0);
  });

  it("liste les entreprises à relancer avec une raison", () => {
    const list = [
      T({ id: "a", plan_expires_at: "2026-11-10" }),
      T({ id: "b", instruments: 60, max_instruments: 50, plan_expires_at: "2026-12-30" }),
      T({ id: "c", plan_expires_at: "2026-11-25" }),
      T({ id: "d", plan: "standard", plan_expires_at: "2027-05-01", last_sign_in_at: "2026-11-01T08:00:00Z" }),
      T({ id: "e", plan: "standard", plan_expires_at: "2027-05-01", last_sign_in_at: "2026-11-16T08:00:00Z" }),
      T({ id: "f", status: "blocked", plan_expires_at: "2026-10-01" }),
    ];
    expect(followUps(list, today).map((f) => [f.tenant.id, f.reason])).toEqual([
      ["a", "Essai terminé"], ["b", "Limite d'instruments dépassée"], ["c", "Essai fini dans 8 j"], ["d", "Aucune connexion depuis 16 j"],
    ]);
  });

  it("compte les inscriptions des 12 derniers mois", () => {
    const m = signupsByMonth([T({ created_at: "2026-11-02T00:00:00Z" }), T({ created_at: "2026-10-30T00:00:00Z" }), T({ created_at: "2025-01-01T00:00:00Z" })], today);
    expect(m).toHaveLength(12);
    expect(m[11]).toEqual({ label: "Nov", count: 1 });
    expect(m[10].count).toBe(1);
    expect(m.reduce((s, x) => s + x.count, 0)).toBe(2);
  });

  it("calcule la conversion sur les entreprises inscrites depuis 30 jours et plus", () => {
    const c = conversion([
      T({ created_at: "2026-09-01T00:00:00Z", plan: "standard" }),
      T({ created_at: "2026-09-10T00:00:00Z", plan: "essai" }),
      T({ created_at: "2026-11-10T00:00:00Z", plan: "starter" }),
    ], today);
    expect(c).toEqual({ eligible: 2, converted: 1, rate: 0.5 });
    expect(conversion([], today).rate).toBeNull();
  });
});

describe("platform_overview (migration 0014)", () => {
  it("donne l'e-mail de l'administrateur et la dernière connexion, et reste réservée à la plateforme", async () => {
    const { createContext, rows, fails, ID } = await import("./helpers");
    const c = await createContext();
    await c.db.exec(`update auth.users set email='alice@a.sn', last_sign_in_at='2026-11-10T08:00:00Z' where id='${ID.A_ADMIN}';
      update auth.users set email='resp@a.sn', last_sign_in_at='2026-11-15T09:00:00Z' where id='${ID.A_RESP}'`);
    const r = await rows<{ name: string; admin_email: string; last_sign_in_at: string }>(c.db,
      "select name, admin_email, last_sign_in_at::text from public.platform_overview() where name = 'Entreprise A'", [ID.PLATFORM, "aal2"]);
    expect(r[0].admin_email).toBe("alice@a.sn");
    expect(r[0].last_sign_in_at.startsWith("2026-11-15")).toBe(true);
    await fails(c.db, "select * from public.platform_overview()", [ID.A_ADMIN, "aal2"]);
  });
});
