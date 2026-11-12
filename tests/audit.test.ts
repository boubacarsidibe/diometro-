import { describe, expect, it } from "vitest";
import { auditUser, describeAudit, type AuditRow } from "@/lib/audit";

const row = (p: Partial<AuditRow>): AuditRow => ({ id: 1, user_id: null, action: "update", entity: "instruments", entity_id: "9a5cf020-0000-0000-0000-000000000000", created_at: "2026-11-07T18:54:53Z", detail: null, ...p });
const inst = { id: "x", ref: "MAN-021", designation: "Manomètre", tolerance: "0,1 bar", deleted_at: null, updated_at: "a" };

describe("journal d'audit lisible", () => {
  it("nomme la modification et liste les champs modifiés (avant → après), sans champs techniques", () => {
    const v = describeAudit(row({ detail: { before: inst, after: { ...inst, tolerance: "0,2 bar", updated_at: "b" } } }));
    expect(v.label).toBe("Modification de l'instrument");
    expect(v.object).toBe("MAN-021 — Manomètre");
    expect(v.changes).toEqual([{ field: "Tolérance / EMT", before: "0,1 bar", after: "0,2 bar" }]);
  });
  it("distingue archivage et restauration", () => {
    expect(describeAudit(row({ detail: { before: inst, after: { ...inst, deleted_at: "2026-11-10T10:00:00Z" } } })).label).toBe("Archivage de l'instrument");
    expect(describeAudit(row({ detail: { before: { ...inst, deleted_at: "2026-11-10T10:00:00Z" }, after: inst } })).label).toBe("Restauration de l'instrument");
  });
  it("traduit créations, suppressions et formats de date", () => {
    expect(describeAudit(row({ action: "insert", entity: "inventory_runs", detail: { created_at: "2026-11-07T10:00:00Z" } })).label).toBe("Création de l'inventaire");
    expect(describeAudit(row({ action: "delete", entity: "attachments", detail: { filename: "certif.pdf" } }))).toMatchObject({ label: "Suppression de la pièce jointe", object: "certif.pdf" });
    const v = describeAudit(row({ detail: { before: { ...inst, date_prochaine: "2026-01-01" }, after: { ...inst, date_prochaine: "2027-01-01" } } }));
    expect(v.changes[0]).toEqual({ field: "Prochaine échéance", before: "01/01/2026", after: "01/01/2027" });
  });
  it("une action sans utilisateur est une mise à jour automatique", () => {
    expect(auditUser(null, new Map())).toBe("Mise à jour automatique");
    expect(auditUser("u1", new Map([["u1", "Awa"]]))).toBe("Awa");
  });
});
