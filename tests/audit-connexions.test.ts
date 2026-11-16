import { describe, expect, it } from "vitest";
import { describeAudit, type AuditRow } from "@/lib/audit";

const row = (action: string, detail: Record<string, string> = {}): AuditRow => ({ id: 1, user_id: "u", action, entity: "sessions", entity_id: "u", created_at: "2026-11-16T08:00:00Z", detail });

describe("journal des connexions", () => {
  it("décrit une connexion réussie avec sa méthode", () => {
    expect(describeAudit(row("login", { methode: "Code par e-mail" }))).toEqual({ label: "Connexion", object: "Code par e-mail", changes: [] });
  });
  it("décrit un échec avec le motif en français", () => {
    expect(describeAudit(row("login_failed", { methode: "Code par e-mail", motif: "expired" })).object).toBe("Code par e-mail · code expiré");
  });
  it("décrit une déconnexion", () => {
    expect(describeAudit(row("logout")).label).toBe("Déconnexion");
  });
});
