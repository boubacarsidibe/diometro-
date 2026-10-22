import { fileResponse } from "@/lib/download";
import { buildAuditPdf } from "@/lib/export";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const s = await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: members }] = await Promise.all([
    supabase.from("audit_log").select("user_id, action, entity, entity_id, created_at").order("id", { ascending: false }).limit(1000),
    supabase.from("profiles").select("user_id, display_name"),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const bytes = await buildAuditPdf(
    (data ?? []).map((r) => ({ created_at: r.created_at, user: (r.user_id && names.get(r.user_id)) || "Système", action: r.action, entity: r.entity, entity_id: r.entity_id })),
    s.tenant.name,
  );
  return fileResponse(bytes, "application/pdf", `audit-${new Date().toISOString().slice(0, 10)}.pdf`);
}
