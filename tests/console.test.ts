import { describe, expect, it } from "vitest";
import { conversion, daysSince, daysUntil, followUps, journalChanges, monthlyRevenue, relanceMessage, signupsByMonth, stateOf, type ConsoleTenant } from "@/lib/console";

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

describe("relances et journal", () => {
  const pl = (id: string) => ({ essai: "Essai", standard: "Standard" })[id] ?? id;
  it("choisit le message de relance selon la raison", () => {
    expect(relanceMessage(T({ plan_expires_at: "2026-11-10" }), today, pl).subject).toBe("Votre essai DIOMETRO est terminé");
    expect(relanceMessage(T({ instruments: 60, plan_expires_at: "2027-01-01" }), today, pl).subject).toContain("dépasse la limite");
    expect(relanceMessage(T({ plan_expires_at: "2026-11-25" }), today, pl).subject).toBe("Votre essai DIOMETRO se termine dans 8 jours");
    const idle = relanceMessage(T({ plan: "standard", plan_expires_at: "2027-05-01", last_sign_in_at: "2026-11-01T08:00:00Z" }), today, pl);
    expect(idle.subject).toBe("Comment se passe votre utilisation de DIOMETRO ?");
    expect(idle.body.startsWith("Bonjour,")).toBe(true);
    expect(idle.body.endsWith("Bien cordialement,")).toBe(true);
    expect(idle.body).not.toMatch(/—/);
  });

  it("décrit les changements d'abonnement avant et après", () => {
    const e = { at: "", tenant_id: "x", tenant_name: "A", actor: null, kind: "modification",
      detail: { before: { status: "active", plan: "essai", plan_expires_at: "2026-11-20", max_instruments: 50 },
                after: { status: "active", plan: "standard", plan_expires_at: "2027-11-20", max_instruments: 200 } } };
    expect(journalChanges(e, pl)).toEqual([
      { label: "Formule", before: "Essai", after: "Standard" },
      { label: "Limite", before: "50", after: "200" },
      { label: "Fin d'abonnement", before: "20/11/2026", after: "20/11/2027" },
    ]);
    expect(journalChanges({ ...e, kind: "relance" }, pl)).toEqual([]);
  });
});

describe("journal et relances (migration 0015)", () => {
  it("journalise inscriptions, modifications et relances, réservé à la plateforme", async () => {
    const { createContext, rows, fails, ID } = await import("./helpers");
    const c = await createContext();
    const P: [string, string] = [ID.PLATFORM, "aal2"];
    const a = { id: c.tenantA };
    await rows(c.db, `select public.platform_update_tenant('${a.id}', 'active', 'standard', '2027-11-20', 200)`, P);
    await rows(c.db, `select public.platform_log_relance('${a.id}', 'alice@a.sn', 'Votre essai DIOMETRO est terminé')`, P);
    const j = await rows<{ kind: string; tenant_name: string; detail: Record<string, unknown> }>(c.db, `select kind, tenant_name, detail from public.platform_journal('${a.id}')`, P);
    expect(j.map((x) => x.kind).sort()).toEqual(["inscription", "modification", "relance"]);
    expect(j.every((x) => x.tenant_name === "Entreprise A")).toBe(true);
    expect((j.find((x) => x.kind === "modification")!.detail.after as Record<string, unknown>).plan).toBe("standard");
    expect(j.find((x) => x.kind === "relance")!.detail.to).toBe("alice@a.sn");
    const all = await rows<{ tenant_id: string }>(c.db, "select tenant_id from public.platform_journal()", P);
    expect(new Set(all.map((x) => x.tenant_id)).size).toBeGreaterThan(1);
    await fails(c.db, "select * from public.platform_journal()", [ID.A_ADMIN, "aal2"]);
    await fails(c.db, `select public.platform_log_relance('${a.id}', 'x@y.z', 's')`, [ID.A_ADMIN, "aal2"]);
    await fails(c.db, "select * from public.platform_events", [ID.A_ADMIN, "aal2"]);
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
