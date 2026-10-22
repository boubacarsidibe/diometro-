import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

// Émule la partie de Supabase dont le schéma dépend : rôles, auth.*, storage.*.
export const AUTH_STUB = `
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

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text,
    owner uuid default auth.uid());
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
`;

export const ID = {
  A_ADMIN: "00000000-0000-0000-0000-0000000000a1",
  A_RESP: "00000000-0000-0000-0000-0000000000a2",
  A_VIEW: "00000000-0000-0000-0000-0000000000a3",
  B_ADMIN: "00000000-0000-0000-0000-0000000000b1",
  PLATFORM: "00000000-0000-0000-0000-0000000000f1",
};

export type Ctx = { db: PGlite; tenantA: string; tenantB: string; instrA: string; instrB: string };

export async function migrate(db: PGlite) {
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
}

export async function createContext(): Promise<Ctx> {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  await migrate(db);
  for (const id of Object.values(ID)) await db.exec(`insert into auth.users values ('${id}')`);
  const mk = async (user: string, name: string, who: string) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false), set_config('request.jwt.claim.aal','aal1',false)`);
    const r = await db.query<{ register_tenant: string }>(`select public.register_tenant('${name}','${who}')`);
    await db.exec("reset role");
    return r.rows[0].register_tenant;
  };
  const tenantA = await mk(ID.A_ADMIN, "Entreprise A", "Alice");
  const tenantB = await mk(ID.B_ADMIN, "Entreprise B", "Bob");
  await db.exec(`insert into public.profiles(user_id,tenant_id,display_name,role) values
    ('${ID.A_RESP}','${tenantA}','Resp','responsable'), ('${ID.A_VIEW}','${tenantA}','Lecteur','consultation')`);
  await db.exec(`insert into public.platform_admins(user_id) values ('${ID.PLATFORM}')`);
  await db.exec(`insert into public.profiles(user_id,tenant_id,display_name,role) values ('${ID.PLATFORM}','${tenantB}','Opérateur','consultation')`);
  const ins = async (user: string, tenant: string, ref: string) => {
    await as(db, user, "aal2", () => db.exec(`insert into public.instruments(tenant_id,ref,designation) values ('${tenant}','${ref}','Instrument ${ref}')`));
    return (await db.query<{ id: string }>(`select id from public.instruments where ref='${ref}' and tenant_id='${tenant}'`)).rows[0].id;
  };
  const instrA = await ins(ID.A_ADMIN, tenantA, "A-1");
  const instrB = await ins(ID.B_ADMIN, tenantB, "B-1");
  return { db, tenantA, tenantB, instrA, instrB };
}

export async function as<T>(db: PGlite, user: string | null, aal: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user ?? ""}',false), set_config('request.jwt.claim.aal','${aal}',false)`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

export const fails = async (db: PGlite, sql: string, who: [string, string]) => {
  try {
    await as(db, who[0], who[1], () => db.exec(sql));
    return false;
  } catch {
    return true;
  }
};

export const count = (db: PGlite, sql: string, who: [string, string]) =>
  as(db, who[0], who[1], async () => Number((await db.query<{ n: string }>(`select count(*) n from (${sql}) t`)).rows[0].n));

export const rows = <T extends Record<string, unknown>>(db: PGlite, sql: string, who: [string, string]) =>
  as(db, who[0], who[1], async () => (await db.query<T>(sql)).rows);
