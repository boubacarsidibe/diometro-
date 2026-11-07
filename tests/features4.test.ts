import { beforeAll, describe, expect, it } from "vitest";
import { count, createContext, fails, ID, rows, as, type Ctx } from "./helpers";

let c: Ctx;
const A: [string, string] = [ID.A_ADMIN, "aal2"];
const R: [string, string] = [ID.A_RESP, "aal2"];
const V: [string, string] = [ID.A_VIEW, "aal2"];
const setPlan = (expires: string, status = "active") =>
  as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','${status}','standard', ${expires}, null)`));

beforeAll(async () => { c = await createContext(); });

describe("fréquence d'étalonnage : valeur + unité", () => {
  const ins = (cols: string, vals: string, who: [string, string] = R) =>
    fails(c.db, `insert into public.instruments(tenant_id,ref,designation,${cols}) values ('${c.tenantA}','F-${Math.random().toString(36).slice(2, 7)}','x',${vals})`, who);
  it("accepte les 4 unités, refuse valeur seule, unité seule, hors bornes ou unité inconnue", async () => {
    for (const u of ["jour", "semaine", "mois", "annee"]) expect(await ins("frequence_valeur,frequence_unite", `6,'${u}'`)).toBe(false);
    expect(await ins("frequence_valeur", "6")).toBe(true);
    expect(await ins("frequence_unite", "'mois'")).toBe(true);
    expect(await ins("frequence_valeur,frequence_unite", "0,'mois'")).toBe(true);
    expect(await ins("frequence_valeur,frequence_unite", "4000,'jour'")).toBe(true);
    expect(await ins("frequence_valeur,frequence_unite", "3,'siecle'")).toBe(true);
  });
  it("par défaut le champ est vide (pas de valeur « 1 » imposée)", async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','VIDE','x')`));
    const [r] = await rows<{ frequence_valeur: number | null; frequence_unite: string | null }>(c.db, "select frequence_valeur, frequence_unite from public.instruments where ref='VIDE'", R);
    expect(r).toEqual({ frequence_valeur: null, frequence_unite: null });
  });
});

describe("lecture seule après l'essai", () => {
  beforeAll(async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.prestataires(tenant_id,nom) values ('${c.tenantA}','P-lecture')`));
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`select public.start_inventory('avant expiration')`));
    await setPlan("current_date - 1");
  });
  it("tout reste LISIBLE : instruments, prestataires, audit, entreprise, inventaires", async () => {
    expect(await count(c.db, "select * from public.instruments", V)).toBeGreaterThan(0);
    expect(await count(c.db, "select * from public.prestataires", V)).toBe(1);
    expect(await count(c.db, "select * from public.inventory_runs", V)).toBe(1);
    expect(await count(c.db, "select * from public.tenants", A)).toBe(1);
    expect(await count(c.db, "select * from public.audit_log", A)).toBeGreaterThan(0);
    expect(await count(c.db, "select * from public.profiles", A)).toBeGreaterThan(0);
  });
  it("tout est ENREGISTREMENT REFUSÉ, pour l'admin comme pour le coordinateur", async () => {
    for (const who of [A, R]) {
      expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','X${who[0].slice(-2)}','x')`, who)).toBe(true);
      expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom) values ('${c.tenantA}','N${who[0].slice(-2)}')`, who)).toBe(true);
      expect(await fails(c.db, `insert into public.interventions(tenant_id,instrument_id,date,realise_par) values ('${c.tenantA}','${c.instrA}','2026-01-01','${who[0]}')`, who)).toBe(true);
      expect(await fails(c.db, `insert into public.attachments(tenant_id,instrument_id,kind,filename,mime,size_bytes,storage_path,uploaded_by) values ('${c.tenantA}','${c.instrA}','autre','a.pdf','application/pdf',10,'${c.tenantA}/${c.instrA}/${crypto.randomUUID()}','${who[0]}')`, who)).toBe(true);
      expect(await fails(c.db, `insert into storage.objects(bucket_id,name) values ('attachments','${c.tenantA}/${c.instrA}/${crypto.randomUUID()}')`, who)).toBe(true);
      expect(await fails(c.db, `select public.start_inventory('x')`, who)).toBe(true);
      expect(await fails(c.db, `select public.close_inventory((select id from public.inventory_runs limit 1))`, who)).toBe(true);
      expect(await fails(c.db, `select public.set_public_link('${c.instrA}', false)`, who)).toBe(true);
    }
  });
  it("les modifications (UPDATE) n'ont aucun effet", async () => {
    const attempts = [
      `update public.instruments set designation='pwn'`,
      `update public.prestataires set nom='pwn'`,
      `update public.inventory_checks set found = true`,
      `update public.tenants set name='pwn'`,
      `update public.profiles set active = false where user_id = '${ID.A_VIEW}'`,
    ];
    for (const sql of attempts) for (const who of [A, R]) await as(c.db, who[0], who[1], () => c.db.exec(sql));
    expect(await count(c.db, "select * from public.instruments where designation='pwn'", A)).toBe(0);
    expect(await count(c.db, "select * from public.prestataires where nom='pwn'", A)).toBe(0);
    expect(await count(c.db, "select * from public.inventory_checks where found", A)).toBe(0);
    expect(await count(c.db, "select * from public.tenants where name='pwn'", A)).toBe(0);
    expect(await count(c.db, "select * from public.profiles where active = false", A)).toBe(0);
  });
  it("la page publique du QR continue de fonctionner", async () => {
    const token = (await rows<{ public_token: string }>(c.db, "select public_token from public.instruments where ref='A-1'", A))[0].public_token;
    await c.db.exec(`set role anon`);
    const r = await c.db.query(`select * from public.public_fiche('${token}')`);
    await c.db.exec(`reset role`);
    expect(r.rows).toHaveLength(1);
  });
  it("le paiement (prolongation par le super-admin) rétablit l'écriture sans rien perdre", async () => {
    const before = await count(c.db, "select * from public.instruments", A);
    await setPlan("current_date + 365");
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','APRES','x')`));
    expect(await count(c.db, "select * from public.instruments", A)).toBe(before + 1);
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`update public.inventory_checks set found = true`));
    expect(await count(c.db, "select * from public.inventory_checks where found", A)).toBeGreaterThan(0);
  });
  it("un compte BLOQUÉ n'a plus aucun accès, même en lecture", async () => {
    await setPlan("current_date + 365", "blocked");
    expect(await count(c.db, "select * from public.instruments", A)).toBe(0);
    expect(await count(c.db, "select * from public.prestataires", V)).toBe(0);
    const [s] = await rows<{ status: string }>(c.db, "select status from public.my_tenant_state()", A);
    expect(s.status).toBe("blocked");
  });
});
