import { createServer, type Server } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

// ── Faux Supabase : 2 entreprises, une avec échéances, un administrateur et un coordinateur ──
const state = { inserted: [] as unknown[] };
const rowsByTable: Record<string, unknown[]> = {
  tenants: [{ id: "t1", name: "Dioulatech <b>", plan_expires_at: null }, { id: "t2", name: "Vide", plan_expires_at: null }],
  profiles: [{ user_id: "u1", tenant_id: "t1" }, { user_id: "u2", tenant_id: "t1" }],
  instruments: [],
  alert_log: [],
};
const today = () => new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (n: number) => { const d = today(); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let rows = rowsByTable[table] ?? [];
      const b: Record<string, unknown> = {
        select: () => b, is: () => b, in: () => b,
        eq: (col: string, val: unknown) => { rows = rows.filter((r) => !(col in (r as object)) || (r as Record<string, unknown>)[col] === val); return b; },
        maybeSingle: async () => ({ data: rows[0] ?? null }),
        insert: async (r: unknown) => { state.inserted.push(r); return { error: null }; },
        then: (res: (v: unknown) => unknown) => res({ data: rows }),
      };
      return b;
    },
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: id === "u1" ? "admin@dioulatech.sn" : "coord@dioulatech.sn" } } }) } },
  }),
}));

// ── Vrai serveur SMTP minimal : reçoit réellement les messages envoyés par nodemailer ──
const received: { to: string[]; data: string }[] = [];
let smtp: Server;
let smtpPort = 0;
beforeAll(async () => {
  smtp = createServer((sock) => {
    let buf = ""; let inData = false; let cur = { to: [] as string[], data: "" };
    sock.write("220 test ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      while (true) {
        if (inData) {
          const end = buf.indexOf("\r\n.\r\n");
          if (end < 0) return;
          cur.data = buf.slice(0, end); buf = buf.slice(end + 5); inData = false;
          received.push(cur); cur = { to: [], data: "" };
          sock.write("250 queued\r\n");
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl < 0) return;
        const line = buf.slice(0, nl); buf = buf.slice(nl + 2);
        const cmd = line.toUpperCase();
        if (cmd.startsWith("EHLO") || cmd.startsWith("HELO")) sock.write("250-test\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (cmd.startsWith("AUTH")) sock.write("235 2.7.0 ok\r\n");
        else if (cmd.startsWith("MAIL FROM")) sock.write("250 ok\r\n");
        else if (cmd.startsWith("RCPT TO")) { cur.to.push(line.replace(/^RCPT TO:\s*<?|>?$/gi, "")); sock.write("250 ok\r\n"); }
        else if (cmd === "DATA") { inData = true; sock.write("354 go\r\n"); }
        else if (cmd === "QUIT") { sock.write("221 bye\r\n"); sock.end(); }
        else sock.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>((r) => smtp.listen(0, "127.0.0.1", r));
  smtpPort = (smtp.address() as { port: number }).port;
});
afterAll(() => new Promise<void>((r) => smtp.close(() => r())));

const SECRET = "0123456789abcdef0123456789abcdef";
const call = async (qs = "", bearer: string | null = SECRET) => {
  const { GET } = await import("@/app/api/cron/alerts/route");
  const headers: Record<string, string> = bearer ? { authorization: `Bearer ${bearer}` } : {};
  const res = await GET(new NextRequest(`http://localhost/api/cron/alerts${qs}`, { headers }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};
const setEnv = (e: Record<string, string | undefined>) => { for (const [k, v] of Object.entries(e)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
const FULL = () => ({ CRON_SECRET: SECRET, SUPABASE_SERVICE_ROLE_KEY: "service", APP_URL: "https://diometro.example", SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtpPort), SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "DIOMETRO <no-reply@example.sn>" });

beforeEach(() => {
  received.length = 0; state.inserted.length = 0;
  setEnv({ CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined, APP_URL: undefined, SMTP_HOST: undefined, SMTP_PORT: undefined, SMTP_USER: undefined, SMTP_PASS: undefined, MAIL_FROM: undefined });
  rowsByTable.instruments = [];
});

describe("/api/cron/alerts", () => {
  it("sans CRON_SECRET : 503 et liste des variables manquantes (noms uniquement)", async () => {
    const r = await call("", null);
    expect(r.status).toBe(503);
    expect(r.body.error).toBe("CRON_SECRET non configuré");
    expect(r.body.missing).toEqual(expect.arrayContaining(["CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]));
  });
  it("mauvais secret ou absent : 401", async () => {
    setEnv(FULL());
    expect((await call("", "mauvais")).status).toBe(401);
    expect((await call("", null)).status).toBe(401);
    setEnv({ CRON_SECRET: "court" }); // secret trop court = refusé même s'il est présent
    expect((await call("", "court")).status).toBe(401);
  });
  it("configuration incomplète : 503 avec les noms manquants, sans fuite de valeur", async () => {
    setEnv({ ...FULL(), SMTP_PASS: undefined, MAIL_FROM: undefined });
    const r = await call();
    expect(r.status).toBe(503);
    expect(r.body.missing).toEqual(expect.arrayContaining(["SMTP_PASS", "MAIL_FROM"]));
    expect(JSON.stringify(r.body)).not.toContain(SECRET);
  });
  it("SMTP injoignable ou refusé : 502 avec le code d'erreur", async () => {
    setEnv({ ...FULL(), SMTP_PORT: "1" });
    const r = await call();
    expect(r.status).toBe(502);
    expect(r.body.error).toBe("Connexion SMTP refusée");
    expect((r.body.smtp as { code: string }).code).toBeTruthy();
    expect(JSON.stringify(r.body)).not.toContain("\"p\"");
  });
  it("envoie un vrai email aux administrateurs et coordinateurs à un jalon (J-7), contenu échappé", async () => {
    setEnv(FULL());
    rowsByTable.instruments = [{ tenant_id: "t1", ref: "<img src=x>", designation: "Manomètre", date_prochaine: inDays(7), statut: "En service" }];
    const r = await call();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ sent: 1, failed: 0, forced: false, recipients: 2 });
    expect(received).toHaveLength(1);
    expect(received[0].to.sort()).toEqual(["admin@dioulatech.sn", "coord@dioulatech.sn"]);
    const html = received[0].data.slice(received[0].data.indexOf("Content-Type: text/html"));
    expect(received[0].data).toMatch(/Subject: =\?UTF-8\?Q\?DIOMETRO_-_1_instrument/); // objet encodé, sans retour à la ligne injectable
    expect(html).toContain("&lt;img src=3Dx&gt;"); // partie HTML : contenu échappé
    expect(html).not.toContain("<img src=3Dx>");
    expect(html).not.toContain("<b>");               // le nom d'entreprise est échappé lui aussi
    expect(state.inserted).toHaveLength(1); // journal d'envoi écrit
  });
  it("hors jalon : rien n'est envoyé ; ?force=1 envoie quand même, sans écrire au journal", async () => {
    setEnv(FULL());
    rowsByTable.instruments = [{ tenant_id: "t1", ref: "M-1", designation: "Manomètre", date_prochaine: inDays(11), statut: "En service" }];
    const normal = await call();
    expect(normal.body).toMatchObject({ sent: 0 });
    expect(received).toHaveLength(0);
    const forced = await call("?force=1");
    expect(forced.body).toMatchObject({ sent: 1, forced: true });
    expect(received).toHaveLength(1);
    expect(state.inserted).toHaveLength(0);
  });
  it("instruments hors service ou sans échéance proche : aucun email, même forcé", async () => {
    setEnv(FULL());
    rowsByTable.instruments = [{ tenant_id: "t1", ref: "A", designation: "x", date_prochaine: inDays(3), statut: "Hors service" }, { tenant_id: "t1", ref: "B", designation: "y", date_prochaine: inDays(200), statut: "En service" }];
    expect((await call("?force=1")).body).toMatchObject({ sent: 0 });
    expect(received).toHaveLength(0);
  });
});
