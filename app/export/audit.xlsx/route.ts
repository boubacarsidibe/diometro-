import { fileResponse, XLSX_MIME } from "@/lib/download";
import { buildAuditXlsx } from "@/lib/export";
import { requireAdmin } from "@/lib/session";
import { auditUser, describeAudit, type AuditRow } from "@/lib/audit";
import { fmtDateTime, todayIn } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const connexions = new URL(req.url).searchParams.get("connexions") === "1";
  const s = await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: members }] = await Promise.all([
    (connexions ? supabase.from("audit_log").select("id, user_id, action, entity, entity_id, created_at, detail").eq("entity", "sessions") : supabase.from("audit_log").select("id, user_id, action, entity, entity_id, created_at, detail").neq("entity", "sessions")).order("id", { ascending: false }).limit(5000),
    supabase.from("profiles").select("user_id, display_name"),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const bytes = await buildAuditXlsx(
    ((data ?? []) as AuditRow[]).map((r) => {
      const v = describeAudit(r, s.timeZone);
      return { created_at: fmtDateTime(r.created_at, "—", s.timeZone), user: auditUser(r.user_id, names), action: v.label, entity: v.object, entity_id: v.changes.map((c) => `${c.field} : ${c.before ? `${c.before} → ` : ""}${c.after}`).join(" ; ") };
    }),
    s.tenant.name,
    new Date(),
    s.timeZone,
  );
  return fileResponse(bytes, XLSX_MIME, `${connexions ? "connexions" : "audit"}-${todayIn(s.timeZone)}.xlsx`);
}
