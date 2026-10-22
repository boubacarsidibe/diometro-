import { beforeAll, describe, expect, it } from "vitest";
import { count, createContext, fails, ID, rows, as, type Ctx } from "./helpers";

let c: Ctx;
const A: [string, string] = [ID.A_ADMIN, "aal2"];
const R: [string, string] = [ID.A_RESP, "aal2"];
const V: [string, string] = [ID.A_VIEW, "aal2"];
const B: [string, string] = [ID.B_ADMIN, "aal2"];
const P: [string, string] = [ID.PLATFORM, "aal2"];

async function asAnon<T>(fn: () => Promise<T>): Promise<T> {
  await c.db.exec(`set role anon; select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.aal','',false)`);
  try { return await fn(); } finally { await c.db.exec("reset role"); }
}

beforeAll(async () => { c = await createContext(); });

describe("champs métier", () => {
  it("accepte les nouveaux champs et refuse les valeurs invalides", async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.instruments(tenant_id,ref,designation,conformite,etalonnage_type,graduation,tolerance,proprietaire,fiche_link) values ('${c.tenantA}','M-1','Manomètre','Oui','Interne','0,1 bar','±0,5 %','Atelier','https://exemple.sn/fiche.pdf')`));
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation,conformite) values ('${c.tenantA}','M-2','x','Peut-être')`, R)).toBe(true);
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation,etalonnage_type) values ('${c.tenantA}','M-3','x','Magique')`, R)).toBe(true);
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation,fiche_link) values ('${c.tenantA}','M-4','x','javascript:alert(1)')`, R)).toBe(true);
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation,certificat_link) values ('${c.tenantA}','M-5','x','data:text/html,<script>')`, R)).toBe(true);
  });
  it("le prestataire par défaut d'un instrument doit être de la même entreprise", async () => {
    await as(c.db, ID.B_ADMIN, "aal2", () => c.db.exec(`insert into public.prestataires(tenant_id,nom) values ('${c.tenantB}','Labo B2')`));
    const pb = (await c.db.query<{ id: string }>(`select id from public.prestataires where nom='Labo B2'`)).rows[0].id;
    expect(await fails(c.db, `update public.instruments set prestataire_id='${pb}' where ref='M-1'`, R)).toBe(true);
  });
  it("interventions : mode, type de calcul et taille du résultat contrôlés", async () => {
    const ok = `insert into public.interventions(tenant_id,instrument_id,date,realise_par,mode,calcul_type,calcul) values ('${c.tenantA}','${c.instrA}','2026-02-02','${ID.A_RESP}','Interne','direct','{"ok":true}')`;
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(ok));
    expect(await fails(c.db, ok.replace("'Interne'", "'Bizarre'"), R)).toBe(true);
    expect(await fails(c.db, ok.replace("'direct'", "'astrologie'"), R)).toBe(true);
    const big = JSON.stringify({ x: "a".repeat(40000) });
    expect(await fails(c.db, ok.replace(`'{"ok":true}'`, `'${big}'`), R)).toBe(true);
  });
  it("prestataires : tarifs en FCFA, devises et grille bornées", async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.prestataires(tenant_id,nom,tarif_horaire,grille_tarifs) values ('${c.tenantA}','Tarifé',15000,'[{"typeMesure":"Pression","prix":25000,"unite":"point"}]')`));
    const [p] = await rows<{ devise: string }>(c.db, "select devise from public.prestataires where nom='Tarifé'", R);
    expect(p.devise).toBe("XOF");
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom,devise) values ('${c.tenantA}','D','BTC')`, R)).toBe(true);
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom,tarif_horaire) values ('${c.tenantA}','E',-5)`, R)).toBe(true);
    expect(await fails(c.db, `insert into public.prestataires(tenant_id,nom,grille_tarifs) values ('${c.tenantA}','F','{"a":1}')`, R)).toBe(true);
  });
});

describe("limite d'instruments par formule", () => {
  it("refuse au-delà du quota, un archivage libère une place", async () => {
    const n = Number((await c.db.query<{ n: string }>(`select count(*) n from public.instruments where tenant_id='${c.tenantA}' and deleted_at is null`)).rows[0].n);
    await as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','active','starter', current_date + 30, ${n})`));
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','LIM-1','x')`, R)).toBe(true);
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.instruments set deleted_at = now() where ref='M-1'`));
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','LIM-1','x')`));
    expect(await fails(c.db, `insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','LIM-2','x')`, R)).toBe(true);
    await as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','active','grandcompte', current_date + 30, null)`));
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${c.tenantA}','LIM-2','x')`));
  });
  it("seul le super-admin règle formule et limite ; formules valides uniquement", async () => {
    expect(await fails(c.db, `update public.tenants set max_instruments = 99999`, A)).toBe(true);
    expect(await fails(c.db, `select public.platform_update_tenant('${c.tenantA}','active','premium',null,10)`, P)).toBe(true);
    expect(await fails(c.db, `select public.platform_update_tenant('${c.tenantA}','active','pro',null,-1)`, P)).toBe(true);
    expect(await fails(c.db, `select public.platform_update_tenant('${c.tenantA}','active','pro',null,10)`, A)).toBe(true);
    const all = await rows<{ max_instruments: number | null; sector: string }>(c.db, "select max_instruments, sector from public.platform_overview()", P);
    expect(all.length).toBe(2);
  });
});

describe("profil entreprise et utilisateurs", () => {
  it("l'inscription enregistre secteur, téléphone et bâtiments ; essai de 50 instruments", async () => {
    await c.db.exec(`insert into auth.users values ('00000000-0000-0000-0000-0000000000c1')`);
    await as(c.db, "00000000-0000-0000-0000-0000000000c1", "aal1", () => c.db.exec(`select public.register_tenant('Nouvelle','Carole','Agroalimentaire','+221770000000','{Bâtiment A,Bâtiment B}')`));
    const [t] = (await c.db.query<{ sector: string; buildings: string[]; max_instruments: number; plan: string; accreditation_label: string; currency: string }>(`select sector, buildings, max_instruments, plan, accreditation_label, currency from public.tenants where name='Nouvelle'`)).rows;
    expect(t).toMatchObject({ sector: "Agroalimentaire", buildings: ["Bâtiment A", "Bâtiment B"], max_instruments: 50, plan: "essai", accreditation_label: "COFRAC", currency: "XOF" });
  });
  it("organisme d'accréditation et devise réglables par l'admin, valeurs validées", async () => {
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.tenants set accreditation_label='SENAC', currency='XOF'`));
    expect(await count(c.db, "select * from public.tenants where accreditation_label='SENAC'", V)).toBe(1);
    expect(await fails(c.db, `update public.tenants set currency='DOGE'`, A)).toBe(true);
    expect(await fails(c.db, `update public.tenants set accreditation_label=''`, A)).toBe(true);
  });
  it("téléphone : modifiable par l'admin, pas par un consultant", async () => {
    await as(c.db, ID.A_ADMIN, "aal2", () => c.db.exec(`update public.profiles set phone='+221771112233' where user_id='${ID.A_VIEW}'`));
    expect(await count(c.db, `select * from public.profiles where phone='+221771112233'`, V)).toBe(1);
    await as(c.db, ID.A_VIEW, "aal2", () => c.db.exec(`update public.profiles set phone='x' where user_id='${ID.A_RESP}'`));
    expect(await count(c.db, `select * from public.profiles where phone='x'`, A)).toBe(0);
  });
});

describe("lien public QR", () => {
  let token: string;
  it("désactivé par défaut ; un coordinateur l'active, un consultant non", async () => {
    expect(await count(c.db, "select * from public.instruments where public_token is not null", A)).toBe(0);
    expect(await fails(c.db, `select public.set_public_link('${c.instrA}', true)`, V)).toBe(true);
    expect(await fails(c.db, `select public.set_public_link('${c.instrB}', true)`, R)).toBe(true); // autre entreprise
    token = await as(c.db, ID.A_RESP, "aal2", async () => (await c.db.query<{ set_public_link: string }>(`select public.set_public_link('${c.instrA}', true)`)).rows[0].set_public_link);
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("le jeton ne peut pas être forgé par UPDATE direct", async () => {
    expect(await fails(c.db, `update public.instruments set public_token = gen_random_uuid() where ref='A-1'`, A)).toBe(true);
  });
  it("lecture publique : colonnes minimales seulement", async () => {
    const r = await asAnon(async () => (await c.db.query<Record<string, unknown>>(`select * from public.public_instrument('${token}')`)).rows);
    expect(r).toHaveLength(1);
    expect(Object.keys(r[0]).sort()).toEqual(["conformite", "date_etalonnage", "date_prochaine", "designation", "entreprise", "ref", "statut", "type_mesure"]);
    expect(r[0].entreprise).toBe("Entreprise A");
    const none = await asAnon(async () => (await c.db.query(`select * from public.public_instrument('00000000-0000-0000-0000-000000000000')`)).rows);
    expect(none).toHaveLength(0);
  });
  it("les visiteurs anonymes n'accèdent à aucune table", async () => {
    for (const t of ["instruments", "tenants", "profiles", "prestataires", "attachments", "audit_log"]) {
      await expect(asAnon(() => c.db.query(`select * from public.${t}`))).rejects.toThrow();
    }
    await expect(asAnon(() => c.db.query(`select * from public.platform_overview()`))).rejects.toThrow();
  });
  it("désactivation et blocage coupent le lien", async () => {
    await as(c.db, ID.A_RESP, "aal2", () => c.db.exec(`select public.set_public_link('${c.instrA}', false)`));
    expect(await asAnon(async () => (await c.db.query(`select * from public.public_instrument('${token}')`)).rows)).toHaveLength(0);
    const t2 = await as(c.db, ID.A_RESP, "aal2", async () => (await c.db.query<{ set_public_link: string }>(`select public.set_public_link('${c.instrA}', true)`)).rows[0].set_public_link);
    expect(await asAnon(async () => (await c.db.query(`select * from public.public_instrument('${t2}')`)).rows)).toHaveLength(1);
    await as(c.db, ID.PLATFORM, "aal2", () => c.db.exec(`select public.platform_update_tenant('${c.tenantA}','blocked','pro',null,null)`));
    expect(await asAnon(async () => (await c.db.query(`select * from public.public_instrument('${t2}')`)).rows)).toHaveLength(0);
    expect(await count(c.db, "select * from public.instruments", B)).toBe(1);
  });
});
