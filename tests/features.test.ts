import { beforeAll, describe, expect, it } from "vitest";
import { count, createContext, fails, ID, rows, as, type Ctx } from "./helpers";

let c: Ctx;
const A = (aal = "aal2"): [string, string] => [ID.A_ADMIN, aal];
const R: [string, string] = [ID.A_RESP, "aal2"];
const V: [string, string] = [ID.A_VIEW, "aal2"];
const B: [string, string] = [ID.B_ADMIN, "aal2"];
const P: [string, string] = [ID.PLATFORM, "aal2"];

beforeAll(async () => {
  c = await createContext();
});

describe("prestataires", () => {
  it("un coordinateur crée et modifie, un consultant ne peut que lire", async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.prestataires(tenant_id,nom,cofrac,domaines) values ('${c.tenantA}','Labo Métro',true,'{Température,Pression}')`));
    expect(await count(c.db, "select * from public.prestataires", V)).toBe(1);
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom) values ('${c.tenantA}','Autre')`, V)).toBe(true);
    await as(c.db, ID.A_VIEW, "aal2", () => c.db.exec(`update public.prestataires set nom='pwn'`));
    expect(await count(c.db, "select * from public.prestataires where nom='pwn'", R)).toBe(0);
  });
  it("isolation entre entreprises et validations", async () => {
    expect(await count(c.db, "select * from public.prestataires", B)).toBe(0);
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom) values ('${c.tenantA}','Intrus')`, B)).toBe(true);
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom,site_web) values ('${c.tenantA}','X','javascript:alert(1)')`, R)).toBe(true);
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom,note_interne) values ('${c.tenantA}','Y',9)`, R)).toBe(true);
    expect(await fails(c.db, `delete from public.prestataires`, A())).toBe(true);
  });
  it("une intervention ne peut pas viser le prestataire d'une autre entreprise", async () => {
    await as(c.db, ID.B_ADMIN, "aal2", () => c.db.exec(`insert into public.prestataires(tenant_id,nom) values ('${c.tenantB}','Labo B')`));
    const pb = (await c.db.query<{ id: string }>(`select id from public.prestataires where nom='Labo B'`)).rows[0].id;
    expect(await fails(c.db, `insert into public.interventions(tenant_id,instrument_id,date,realise_par,prestataire_id) values ('${c.tenantA}','${c.instrA}','2026-01-01','${ID.A_RESP}','${pb}')`, R)).toBe(true);
    const pa = (await c.db.query<{ id: string }>(`select id from public.prestataires where nom='Labo Métro'`)).rows[0].id;
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.interventions(tenant_id,instrument_id,date,realise_par,prestataire_id) values ('${c.tenantA}','${c.instrA}','2026-01-01','${ID.A_RESP}','${pa}')`));
  });
  it("suppression logique puis restauration", async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`update public.prestataires set deleted_at = now() where nom='Labo Métro'`));
    expect(await count(c.db, "select * from public.prestataires where deleted_at is not null", V)).toBe(1);
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`update public.prestataires set deleted_at = null where nom='Labo Métro'`));
    expect(await count(c.db, "select * from public.prestataires where deleted_at is not null", V)).toBe(0);
  });
});

describe("inventaire", () => {
  let run: string;
  it("seul un coordinateur/admin démarre un inventaire ; un seul à la fois", async () => {
    expect(await fails(c.db, `select public.start_inventory('x')`, V)).toBe(true);
    run = await as(c.db, ID.A_RESP, "aal2", async () => (await c.db.query<{ start_inventory: string }>(`select public.start_inventory('Annuel')`)).rows[0].start_inventory);
    expect(await count(c.db, `select * from public.inventory_checks where run_id='${run}'`, V)).toBe(1);
    expect(await fails(c.db, `select public.start_inventory('bis')`, A())).toBe(true);
    expect(await count(c.db, "select * from public.inventory_runs", B)).toBe(0);
  });
  it("cocher : coordinateur oui, consultant non, horodaté", async () => {
    await as(c.db, ID.A_VIEW, "aal2", () => c.db.exec(`update public.inventory_checks set found = true`));
    expect(await count(c.db, "select * from public.inventory_checks where found", R)).toBe(0);
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`update public.inventory_checks set found = true`));
    const [chk] = await rows<{ checked_by: string }>(c.db, "select checked_by from public.inventory_checks where found", R);
    expect(chk.checked_by).toBe(ID.A_RESP);
  });
  it("la clôture fige des compteurs calculés par la base", async () => {
    expect(await fails(c.db, `update public.inventory_runs set found_count = 99 where id='${run}'`, R)).toBe(true);
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`select public.close_inventory('${run}')`));
    const [r] = await rows<{ status: string; total_count: number; found_count: number }>(c.db, "select status,total_count,found_count from public.inventory_runs", V);
    expect(r).toMatchObject({ status: "cloture", total_count: 1, found_count: 1 });
    expect(await fails(c.db, `select public.close_inventory('${run}')`, R)).toBe(true);
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`update public.inventory_checks set found = false`));
    expect(await count(c.db, "select * from public.inventory_checks where found", R)).toBe(1);
  });
});

describe("plateforme SaaS", () => {
  it("l'entreprise reçoit un essai de 30 jours", async () => {
    const [t] = await rows<{ plan: string; ok: boolean }>(c.db, "select plan, (plan_expires_at > current_date + 25) as ok from public.tenants", A());
    expect(t).toMatchObject({ plan: "essai", ok: true });
  });
  it("un admin d'entreprise ne peut ni changer statut/abonnement ni se promouvoir super-admin", async () => {
    expect(await fails(c.db, `update public.tenants set status='blocked'`, A())).toBe(true);
    expect(await fails(c.db, `update public.tenants set plan='pro'`, A())).toBe(true);
    expect(await fails(c.db, `insert into public.platform_admins values ('${ID.A_ADMIN}')`, A())).toBe(true);
    expect(await fails(c.db, `select * from public.platform_admins`, A())).toBe(true);
    expect(await fails(c.db, `select * from public.platform_overview()`, A())).toBe(true);
    expect(await fails(c.db, `select public.platform_update_tenant('${c.tenantA}','blocked','pro',null)`, A())).toBe(true);
  });
  it("logo : seuls les images autorisées, réservé à l'admin", async () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.tenants set logo_data='${png}', accent='#0f766e'`));
    expect(await count(c.db, `select * from public.tenants where logo_data='${png}'`, V)).toBe(1);
    expect(await fails(c.db, `update public.tenants set logo_data='data:image/svg+xml;base64,PHN2Zz4='`, A())).toBe(true);
    expect(await fails(c.db, `update public.tenants set logo_data='data:image/png;base64,AAAA"onerror="x'`, A())).toBe(true);
    expect(await fails(c.db, `update public.tenants set accent='red;background:url(x)'`, A())).toBe(true);
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`update public.tenants set name='pwn'`));
    expect(await count(c.db, "select * from public.tenants where name='pwn'", A())).toBe(0);
  });
  it("le super-admin bloque une entreprise : plus aucun accès, avec trace d'audit", async () => {
    const all = await rows<{ name: string; users: string; instruments: string }>(c.db, "select name, users, instruments from public.platform_overview()", P);
    expect(all.map((t) => t.name).sort()).toEqual(["Entreprise A", "Entreprise B"]);
    await as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','blocked','standard',null)`));
    expect(await count(c.db, "select * from public.instruments", A())).toBe(0);
    expect(await count(c.db, "select * from public.instruments", R)).toBe(0);
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','Z','z')`, A())).toBe(true);
    const [s] = await rows<{ status: string }>(c.db, "select status from public.my_tenant_state()", A());
    expect(s.status).toBe("blocked");
    expect(await count(c.db, "select * from public.instruments", B)).toBe(1); // l'autre entreprise n'est pas touchée
    await c.db.exec(`select 1`);
    const audit = await c.db.query<{ n: string }>(`select count(*) n from public.audit_log where action='platform_update' and tenant_id='${c.tenantA}'`);
    expect(Number(audit.rows[0].n)).toBe(1);
  });
  it("un abonnement expiré coupe l'accès, une prolongation le rétablit", async () => {
    await as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','active','standard', current_date - 1)`));
    expect(await count(c.db, "select * from public.instruments", A())).toBe(0);
    await as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','active','standard', current_date + 365)`));
    expect(await count(c.db, "select * from public.instruments", A())).toBe(1);
    expect(await fails(c.db, `select public.platform_update_tenant('${c.tenantA}','nimporte','standard',null)`, P)).toBe(true);
    expect(await fails(c.db, `select * from public.platform_overview()`, [ID.PLATFORM, "aal1"])).toBe(true);
  });
});

describe("pièces jointes", () => {
  const path = (tenant: string, instr: string, n: string) => `${tenant}/${instr}/${n}`;
  it("un coordinateur référence un fichier de sa propre entreprise", async () => {
    const p = path(c.tenantA, c.instrA, "11111111-1111-1111-1111-111111111111");
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.attachments(tenant_id,instrument_id,kind,filename,mime,size_bytes,storage_path,uploaded_by) values ('${c.tenantA}','${c.instrA}','certificat','cert.pdf','application/pdf',1234,'${p}','${ID.A_RESP}')`));
    expect(await count(c.db, "select * from public.attachments", V)).toBe(1);
    expect(await count(c.db, "select * from public.attachments", B)).toBe(0);
  });
  it("refuse chemins étrangers, instrument d'une autre entreprise, types et tailles interdits, consultant", async () => {
    const ok = (extra: string) => `insert into public.attachments(tenant_id,instrument_id,kind,filename,mime,size_bytes,storage_path,uploaded_by) values ${extra}`;
    const u = "22222222-2222-2222-2222-222222222222";
    expect(await fails(c.db, ok(`('${c.tenantA}','${c.instrA}','autre','a.pdf','application/pdf',10,'${c.tenantB}/${c.instrA}/${u}','${ID.A_RESP}')`), R)).toBe(true);
    expect(await fails(c.db, ok(`('${c.tenantA}','${c.instrB}','autre','a.pdf','application/pdf',10,'${path(c.tenantA, c.instrB, u)}','${ID.A_RESP}')`), R)).toBe(true);
    expect(await fails(c.db, ok(`('${c.tenantA}','${c.instrA}','autre','a.exe','application/x-msdownload',10,'${path(c.tenantA, c.instrA, u)}','${ID.A_RESP}')`), R)).toBe(true);
    expect(await fails(c.db, ok(`('${c.tenantA}','${c.instrA}','autre','a.pdf','application/pdf',99999999,'${path(c.tenantA, c.instrA, u)}','${ID.A_RESP}')`), R)).toBe(true);
    expect(await fails(c.db, ok(`('${c.tenantA}','${c.instrA}','autre','a.pdf','application/pdf',10,'${path(c.tenantA, c.instrA, u)}','${ID.A_RESP}')`), V)).toBe(true);
    expect(await fails(c.db, ok(`('${c.tenantA}','${c.instrA}','autre','a.pdf','application/pdf',10,'${path(c.tenantA, c.instrA, u)}','${ID.A_ADMIN}')`), R)).toBe(true); // usurpation
  });
  it("stockage : accès limité au dossier de son entreprise", async () => {
    const mine = path(c.tenantA, c.instrA, "33333333-3333-3333-3333-333333333333");
    const theirs = path(c.tenantB, c.instrB, "44444444-4444-4444-4444-444444444444");
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into storage.objects(bucket_id,name) values ('attachments','${mine}')`));
    expect(await fails(c.db, `insert into storage.objects(bucket_id,name) values ('attachments','${theirs}')`, R)).toBe(true);
    expect(await fails(c.db, `insert into storage.objects(bucket_id,name) values ('attachments','${path(c.tenantA, c.instrA, "55555555-5555-5555-5555-555555555555")}')`, V)).toBe(true);
    expect(await fails(c.db, `insert into storage.objects(bucket_id,name) values ('autre-bucket','${mine}x')`, R)).toBe(true); // aucun autre bucket n'est ouvert
    expect(await count(c.db, "select * from storage.objects where bucket_id='attachments'", V)).toBe(1);
    expect(await count(c.db, "select * from storage.objects where bucket_id='attachments'", B)).toBe(0);
    expect(await fails(c.db, `delete from storage.objects where name='${mine}'`, V)).toBe(false);
    expect(await count(c.db, "select * from storage.objects where bucket_id='attachments'", V)).toBe(1); // suppression sans effet
    const [bk] = (await c.db.query<{ public: boolean; file_size_limit: string }>(`select public, file_size_limit from storage.buckets where id='attachments'`)).rows;
    expect(bk.public).toBe(false);
    expect(Number(bk.file_size_limit)).toBe(10485760);
  });
});
