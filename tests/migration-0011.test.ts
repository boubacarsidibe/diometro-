import { beforeAll, describe, expect, it } from "vitest";
import { as, createContext, fails, ID, type Ctx } from "./helpers";

let c: Ctx;
beforeAll(async () => {
  c = await createContext();
});

describe("migration 0011", () => {
  it("enregistre opérateur, étalon de référence et conditions ambiantes sur l'intervention", async () => {
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`insert into public.interventions (tenant_id, instrument_id, date, realise_par, operateur, etalon_reference, temperature_ambiante, humidite_relative)
      values ('${c.tenantA}', '${c.instrA}', '2026-11-12', '${ID.A_ADMIN}', 'Awa Ndiaye', 'Sonde étalon SN 4411', 21.5, 45)`));
    const r = await c.db.query<{ operateur: string; humidite_relative: string }>(`select operateur, humidite_relative from public.interventions where instrument_id = '${c.instrA}'`);
    expect(r.rows[0].operateur).toBe("Awa Ndiaye");
    expect(Number(r.rows[0].humidite_relative)).toBe(45);
    expect(await fails(c.db, `insert into public.interventions (tenant_id, instrument_id, date, realise_par, humidite_relative) values ('${c.tenantA}', '${c.instrA}', '2026-11-12', '${ID.A_ADMIN}', 140)`, [ID.A_ADMIN, "aal2"])).toBe(true);
  });

  it("accepte les fréquences « à chaque utilisation » et « à vie », refuse une unité inconnue", async () => {
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.instruments set frequence_valeur = 1, frequence_unite = 'utilisation' where id = '${c.instrA}'`));
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.instruments set frequence_valeur = 1, frequence_unite = 'vie' where id = '${c.instrA}'`));
    expect(await fails(c.db, `update public.instruments set frequence_valeur = 1, frequence_unite = 'siecle' where id = '${c.instrA}'`, [ID.A_ADMIN, "aal2"])).toBe(true);
  });

  it("suppression définitive : administrateur seulement, élément archivé seulement, de sa propre entreprise", async () => {
    // Non archivé : refusé.
    expect(await fails(c.db, `select public.purge_archived('instruments', '${c.instrA}')`, [ID.A_ADMIN, "aal2"])).toBe(true);
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.instruments set deleted_at = now() where id = '${c.instrA}'`));
    // Coordinateur, autre entreprise ou sans second facteur : refusé.
    expect(await fails(c.db, `select public.purge_archived('instruments', '${c.instrA}')`, [ID.A_RESP, "aal2"])).toBe(true);
    expect(await fails(c.db, `select public.purge_archived('instruments', '${c.instrA}')`, [ID.B_ADMIN, "aal2"])).toBe(true);
    expect(await fails(c.db, `select public.purge_archived('instruments', '${c.instrA}')`, [ID.A_ADMIN, "aal1"])).toBe(true);
    // Administrateur de l'entreprise : supprimé avec ses interventions, trace conservée dans l'audit.
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`select public.purge_archived('instruments', '${c.instrA}')`));
    expect((await c.db.query(`select 1 from public.instruments where id = '${c.instrA}'`)).rows.length).toBe(0);
    expect((await c.db.query(`select 1 from public.interventions where instrument_id = '${c.instrA}'`)).rows.length).toBe(0);
    expect((await c.db.query(`select 1 from public.audit_log where action = 'delete' and entity = 'instruments' and entity_id = '${c.instrA}'`)).rows.length).toBe(1);
  });
});
