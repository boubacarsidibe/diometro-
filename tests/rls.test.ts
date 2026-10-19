import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Émule la partie de Supabase dont le schéma dépend : rôles, auth.users, auth.uid(), auth.jwt().
const AUTH_STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true),
                                 'aal', current_setting('request.jwt.claim.aal', true)) $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

const A_ADMIN = "00000000-0000-0000-0000-0000000000a1";
const A_RESP = "00000000-0000-0000-0000-0000000000a2";
const A_VIEW = "00000000-0000-0000-0000-0000000000a3";
const B_ADMIN = "00000000-0000-0000-0000-0000000000b1";

let db: PGlite;
let tenantA: string;
let tenantB: string;

async function as<T>(user: string | null, aal: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user ?? ""}',false), set_config('request.jwt.claim.aal','${aal}',false)`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

async function fails(sql: string, who: [string, string]): Promise<boolean> {
  try {
    await as(who[0], who[1], () => db.exec(sql));
    return false;
  } catch {
    return true;
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(AUTH_STUB);
  await db.exec(readFileSync("supabase/migrations/0001_init.sql", "utf8"));
  for (const id of [A_ADMIN, A_RESP, A_VIEW, B_ADMIN]) await db.exec(`insert into auth.users values ('${id}')`);

  tenantA = await as(A_ADMIN, "aal1", async () => (await db.query<{ create_tenant: string }>(`select public.create_tenant('Entreprise A','Alice')`)).rows[0].create_tenant);
  tenantB = await as(B_ADMIN, "aal1", async () => (await db.query<{ create_tenant: string }>(`select public.create_tenant('Entreprise B','Bob')`)).rows[0].create_tenant);
  // Rattachement des autres membres de A (provisionnement serveur, hors API publique).
  await db.exec(`insert into public.profiles(user_id,tenant_id,display_name,role) values
    ('${A_RESP}','${tenantA}','Resp','responsable'), ('${A_VIEW}','${tenantA}','Lecteur','consultation')`);
  await as(A_ADMIN, "aal2", () => db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${tenantA}','A-1','Manomètre A')`));
  await as(B_ADMIN, "aal2", () => db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${tenantB}','B-1','Balance B')`));
});

const count = (sql: string, who: [string, string]) =>
  as(who[0], who[1], async () => Number((await db.query<{ n: string }>(`select count(*) n from (${sql}) t`)).rows[0].n));

describe("isolation multi-entreprise (RLS)", () => {
  it("chaque entreprise ne voit que ses instruments", async () => {
    expect(await count("select * from public.instruments", [A_ADMIN, "aal2"])).toBe(1);
    expect(await count("select * from public.instruments where ref='B-1'", [A_ADMIN, "aal2"])).toBe(0);
    expect(await count("select * from public.instruments where ref='A-1'", [B_ADMIN, "aal2"])).toBe(0);
  });

  it("sans MFA (aal1) aucune donnée métier n'est accessible", async () => {
    expect(await count("select * from public.instruments", [A_ADMIN, "aal1"])).toBe(0);
    expect(await count("select * from public.profiles where user_id <> auth.uid()", [A_ADMIN, "aal1"])).toBe(0);
    expect(await fails(`insert into public.instruments(tenant_id,ref,designation) values ('${tenantA}','X','x')`, [A_ADMIN, "aal1"])).toBe(true);
  });

  it("refuse l'écriture dans une autre entreprise", async () => {
    expect(await fails(`insert into public.instruments(tenant_id,ref,designation) values ('${tenantB}','HACK','x')`, [A_ADMIN, "aal2"])).toBe(true);
    await as(A_ADMIN, "aal2", () => db.exec(`update public.instruments set designation='pwn' where ref='B-1'`));
    expect(await count("select * from public.instruments where designation='pwn'", [B_ADMIN, "aal2"])).toBe(0);
  });

  it("le rôle consultation est en lecture seule", async () => {
    expect(await count("select * from public.instruments", [A_VIEW, "aal2"])).toBe(1);
    expect(await fails(`insert into public.instruments(tenant_id,ref,designation) values ('${tenantA}','V-1','x')`, [A_VIEW, "aal2"])).toBe(true);
    await as(A_VIEW, "aal2", () => db.exec(`update public.instruments set designation='pwn' where ref='A-1'`));
    expect(await count("select * from public.instruments where designation='pwn'", [A_ADMIN, "aal2"])).toBe(0);
  });

  it("un utilisateur ne peut pas s'élever en admin ni changer d'entreprise", async () => {
    await as(A_VIEW, "aal2", () => db.exec(`update public.profiles set role='admin' where user_id='${A_VIEW}'`));
    expect(await count(`select * from public.profiles where user_id='${A_VIEW}' and role='admin'`, [A_ADMIN, "aal2"])).toBe(0);
    expect(await fails(`update public.profiles set tenant_id='${tenantB}' where user_id='${A_ADMIN}'`, [A_ADMIN, "aal2"])).toBe(true);
  });

  it("un admin ne peut pas retirer le dernier administrateur", async () => {
    expect(await fails(`update public.profiles set role='consultation' where user_id='${A_ADMIN}'`, [A_ADMIN, "aal2"])).toBe(true);
  });

  it("interdit la suppression physique et la modification de colonnes protégées", async () => {
    expect(await fails(`delete from public.instruments where ref='A-1'`, [A_ADMIN, "aal2"])).toBe(true);
    expect(await count("select * from public.instruments", [A_ADMIN, "aal2"])).toBe(1);
    expect(await fails(`update public.tenants set id=gen_random_uuid() where id='${tenantA}'`, [A_ADMIN, "aal2"])).toBe(true);
  });

  it("les interventions doivent viser un instrument de la même entreprise", async () => {
    const instrB = (await db.query<{ id: string }>(`select id from public.instruments where ref='B-1'`)).rows[0].id;
    expect(await fails(`insert into public.interventions(tenant_id,instrument_id,date,realise_par) values ('${tenantA}','${instrB}','2026-01-01','${A_ADMIN}')`, [A_ADMIN, "aal2"])).toBe(true);
    const instrA = (await db.query<{ id: string }>(`select id from public.instruments where ref='A-1'`)).rows[0].id;
    await as(A_RESP, "aal2", () => db.exec(`insert into public.interventions(tenant_id,instrument_id,date,realise_par) values ('${tenantA}','${instrA}','2026-01-01','${A_RESP}')`));
    // usurpation de l'auteur interdite
    expect(await fails(`insert into public.interventions(tenant_id,instrument_id,date,realise_par) values ('${tenantA}','${instrA}','2026-01-02','${A_ADMIN}')`, [A_RESP, "aal2"])).toBe(true);
  });

  it("le journal d'audit est réservé aux admins et non modifiable", async () => {
    expect(await count("select * from public.audit_log", [A_ADMIN, "aal2"])).toBeGreaterThan(0);
    expect(await count("select * from public.audit_log", [A_VIEW, "aal2"])).toBe(0);
    expect(await count("select * from public.audit_log", [B_ADMIN, "aal2"])).toBeGreaterThan(0);
    expect(await count(`select * from public.audit_log where tenant_id='${tenantB}'`, [A_ADMIN, "aal2"])).toBe(0);
    expect(await fails(`delete from public.audit_log`, [A_ADMIN, "aal2"])).toBe(true);
    expect(await fails(`update public.audit_log set action='x'`, [A_ADMIN, "aal2"])).toBe(true);
    expect(await fails(`insert into public.audit_log(tenant_id,action,entity,entity_id) values ('${tenantA}','fake','x','1')`, [A_ADMIN, "aal2"])).toBe(true);
  });

  it("create_tenant refuse un compte déjà rattaché et un anonyme", async () => {
    expect(await fails(`select public.create_tenant('Autre','Alice')`, [A_ADMIN, "aal1"])).toBe(true);
    expect(await fails(`select public.create_tenant('Autre','x')`, ["", "aal1"])).toBe(true);
  });
});
