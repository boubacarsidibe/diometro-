import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { renderAlertEmail, selectAlertItems, type AlertInput } from "@/lib/alerts";
import { missingMailVars, mailer, smtpErrorInfo } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayIn, zonedNow } from "@/lib/dates";

export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Appelée chaque jour par Vercel Cron (Authorization: Bearer $CRON_SECRET).
export async function GET(request: NextRequest) {
  // Diagnostic : on liste les NOMS des variables absentes (jamais leurs valeurs).
  const missing = [
    ...(process.env.CRON_SECRET ? [] : ["CRON_SECRET"]),
    ...(process.env.SUPABASE_SERVICE_ROLE_KEY ? [] : ["SUPABASE_SERVICE_ROLE_KEY"]),
    ...missingMailVars(),
    ...(process.env.APP_URL ? [] : ["APP_URL (recommandé)"]),
  ];
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET non configuré", missing }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const blocking = missing.filter((m) => !m.includes("recommandé"));
  if (blocking.length) return NextResponse.json({ error: "Configuration incomplète", missing }, { status: 503 });
  // ?force=1 : envoi de test immédiat (ignore les jalons et la limite d'un envoi par jour, sans écrire dans le journal).
  const force = request.nextUrl.searchParams.get("force") === "1";

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 503 });
  }
  const transport = mailer();
  try {
    await transport.verify(); // identifiants SMTP valides ?
  } catch (e) {
    return NextResponse.json({ error: "Connexion SMTP refusée", smtp: smtpErrorInfo(e) }, { status: 502 });
  }
  const appUrl = (process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  const instant = new Date();
  const summary = { tenants: 0, sent: 0, skipped: 0, failed: 0, forced: force, recipients: 0, errors: [] as { code: string; message: string }[] };

  // select("*") : la colonne time_zone n'existe qu'après la migration 0013 (Dakar par défaut).
  const { data: tenants } = await admin.from("tenants").select("*").eq("status", "active").eq("alerts_enabled", true);
  for (const t of tenants ?? []) {
    // « Aujourd'hui » et le lundi des relances suivent le fuseau de l'entreprise.
    const tz = (t as { time_zone?: string }).time_zone;
    const now = zonedNow(tz, instant);
    const today = todayIn(tz, instant);
    if (t.plan_expires_at && t.plan_expires_at < today) continue;
    summary.tenants++;
    const { data: instruments } = await admin.from("instruments").select("ref, designation, date_prochaine, statut").eq("tenant_id", t.id).is("deleted_at", null);
    const { items, shouldSend } = selectAlertItems((instruments ?? []) as AlertInput[], now);
    if (!(shouldSend || (force && items.length > 0))) { summary.skipped++; continue; }
    if (!force) {
      const { data: already } = await admin.from("alert_log").select("tenant_id").eq("tenant_id", t.id).eq("sent_on", today).maybeSingle();
      if (already) { summary.skipped++; continue; }
    }

    const { data: recipients } = await admin.from("profiles").select("user_id").eq("tenant_id", t.id).eq("active", true).in("role", ["admin", "responsable"]);
    const emails: string[] = [];
    for (const r of recipients ?? []) {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      if (data.user?.email) emails.push(data.user.email);
    }
    if (emails.length === 0) { summary.skipped++; continue; }
    const mail = renderAlertEmail(t.name, items, appUrl, tz);
    try {
      await transport.sendMail({ from: process.env.MAIL_FROM, to: emails, subject: mail.subject, text: mail.text, html: mail.html });
      if (!force) await admin.from("alert_log").insert({ tenant_id: t.id, sent_on: today, items: items.length });
      summary.sent++;
      summary.recipients += emails.length;
    } catch (e) {
      summary.failed++;
      summary.errors.push(smtpErrorInfo(e)); // code et message SMTP, sans identifiants
    }
  }
  return NextResponse.json(summary);
}
