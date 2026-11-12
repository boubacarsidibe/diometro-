import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createContext, ID, type Ctx } from "./helpers";

// Second facteur par code e-mail : la base n'ouvre l'accès qu'avec aal2 OU un code validé pour la session.
const S1 = "11111111-1111-1111-1111-111111111111";
const S2 = "22222222-2222-2222-2222-222222222222";
const hash = (salt: string, code: string) => createHash("sha256").update(`${salt}:${code}`).digest("hex");

let c: Ctx;

async function asSession<T>(user: string, aal: string, sid: string, fn: () => Promise<T>): Promise<T> {
  await c.db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false), set_config('request.jwt.claim.aal','${aal}',false), set_config('request.jwt.claim.session_id','${sid}',false)`);
  try {
    return await fn();
  } finally {
    await c.db.exec("reset role; select set_config('request.jwt.claim.session_id','',false)");
  }
}

const visibleInstruments = (user: string, sid: string) =>
  asSession(user, "aal1", sid, async () => Number((await c.db.query<{ n: string }>("select count(*) n from public.instruments")).rows[0].n));

const verify = (user: string, sid: string, code: string) =>
  asSession(user, "aal1", sid, async () => (await c.db.query<{ r: string }>(`select public.mfa_email_verify('${code}') r`)).rows[0].r);

async function issue(user: string, sid: string, code: string, minutes = 10) {
  const salt = "0123456789abcdef0123456789abcdef";
  await c.db.exec(`insert into public.mfa_email_codes (user_id, session_id, code_hash, salt, expires_at)
    values ('${user}', '${sid}', '${hash(salt, code)}', '${salt}', now() + interval '${minutes} minutes')`);
}

beforeAll(async () => {
  c = await createContext();
});

describe("connexion par code e-mail", () => {
  it("sans second facteur, aucune donnée n'est visible", async () => {
    expect(await visibleInstruments(ID.A_ADMIN, S1)).toBe(0);
  });

  it("un code faux est refusé et compté, le bon code ouvre l'accès pour cette session seulement", async () => {
    await issue(ID.A_ADMIN, S1, "482913");
    expect(await verify(ID.A_ADMIN, S1, "000000")).toBe("invalid");
    expect(await verify(ID.A_ADMIN, S1, "abc")).toBe("invalid");
    expect(await visibleInstruments(ID.A_ADMIN, S1)).toBe(0);
    expect(await verify(ID.A_ADMIN, S1, "482913")).toBe("ok");
    expect(await visibleInstruments(ID.A_ADMIN, S1)).toBeGreaterThan(0);
    // Une autre session du même compte (autre appareil) doit valider son propre code.
    expect(await visibleInstruments(ID.A_ADMIN, S2)).toBe(0);
    // Le code d'un compte ne sert pas à un autre compte.
    expect(await verify(ID.A_RESP, S1, "482913")).toBe("none");
  });

  it("bloque après 5 essais, même avec le bon code ensuite", async () => {
    await issue(ID.A_RESP, S2, "135790");
    for (let i = 0; i < 4; i++) expect(await verify(ID.A_RESP, S2, "111111")).toBe("invalid");
    expect(await verify(ID.A_RESP, S2, "111111")).toBe("locked");
    expect(await verify(ID.A_RESP, S2, "135790")).toBe("locked");
    expect(await visibleInstruments(ID.A_RESP, S2)).toBe(0);
  });

  it("refuse un code expiré", async () => {
    await issue(ID.A_VIEW, S1, "246810", -1);
    expect(await verify(ID.A_VIEW, S1, "246810")).toBe("expired");
    expect(await visibleInstruments(ID.A_VIEW, S1)).toBe(0);
  });

  it("la table des codes est inaccessible depuis le navigateur", async () => {
    await expect(asSession(ID.A_ADMIN, "aal2", S1, () => c.db.query("select * from public.mfa_email_codes"))).rejects.toThrow();
    await expect(asSession(ID.A_ADMIN, "aal2", S1, () => c.db.exec(`insert into public.mfa_email_codes (user_id, session_id, code_hash, salt, expires_at) values ('${ID.A_ADMIN}', '${S2}', '${"0".repeat(64)}', '${"0".repeat(16)}', now() + interval '1 hour')`))).rejects.toThrow();
  });

  it("l'application d'authentification (aal2) reste acceptée", async () => {
    expect(await asSession(ID.B_ADMIN, "aal2", S2, async () => Number((await c.db.query<{ n: string }>("select count(*) n from public.instruments")).rows[0].n))).toBeGreaterThan(0);
  });

  it("la méthode préférée ne change qu'après validation du second facteur", async () => {
    await expect(asSession(ID.B_ADMIN, "aal1", S1, () => c.db.exec("select public.set_mfa_method('totp')"))).rejects.toThrow();
    await asSession(ID.A_ADMIN, "aal1", S1, () => c.db.exec("select public.set_mfa_method('totp')"));
    const r = await c.db.query<{ mfa_method: string }>(`select mfa_method from public.profiles where user_id = '${ID.A_ADMIN}'`);
    expect(r.rows[0].mfa_method).toBe("totp");
  });
});
