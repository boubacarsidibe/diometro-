import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { renderAlertEmail, selectAlertItems, type AlertInput } from "@/lib/alerts";
import { isMailConfigured, mailer } from "@/lib/mail";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!isMailConfigured()) return NextResponse.json({ error: "SMTP non configuré" }, { status: 503 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY non configurée" }, { status: 503 });
  }
  const transport = mailer();
  const appUrl = (process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const summary = { tenants: 0, sent: 0, skipped: 0, failed: 0 };

  const { data: tenants } = await admin.from("tenants").select("id, name, plan_expires_at").eq("status", "active").eq("alerts_enabled", true);
  for (const t of tenants ?? []) {
    if (t.plan_expires_at && t.plan_expires_at < today) continue;
    summary.tenants++;
    const { data: instruments } = await admin.from("instruments").select("ref, designation, date_prochaine, statut").eq("tenant_id", t.id).is("deleted_at", null);
    const { items, shouldSend } = selectAlertItems((instruments ?? []) as AlertInput[], now);
    if (!shouldSend) { summary.skipped++; continue; }
    const { data: already } = await admin.from("alert_log").select("tenant_id").eq("tenant_id", t.id).eq("sent_on", today).maybeSingle();
    if (already) { summary.skipped++; continue; }

    const { data: recipients } = await admin.from("profiles").select("user_id").eq("tenant_id", t.id).eq("active", true).in("role", ["admin", "responsable"]);
    const emails: string[] = [];
    for (const r of recipients ?? []) {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      if (data.user?.email) emails.push(data.user.email);
    }
    if (emails.length === 0) { summary.skipped++; continue; }
    const mail = renderAlertEmail(t.name, items, appUrl);
    try {
      await transport.sendMail({ from: process.env.MAIL_FROM, to: emails, subject: mail.subject, text: mail.text, html: mail.html });
      await admin.from("alert_log").insert({ tenant_id: t.id, sent_on: today, items: items.length });
      summary.sent++;
    } catch {
      summary.failed++; // détail volontairement non renvoyé (pas de fuite d'infos SMTP)
    }
  }
  return NextResponse.json(summary);
}
