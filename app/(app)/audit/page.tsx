import { Topbar } from "@/components/Topbar";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type Row = { id: number; user_id: string | null; action: string; entity: string; entity_id: string; created_at: string };

export default async function AuditPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: members }] = await Promise.all([
    supabase.from("audit_log").select("id, user_id, action, entity, entity_id, created_at").order("id", { ascending: false }).limit(200),
    supabase.from("profiles").select("user_id, display_name"),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const rows = (data ?? []) as Row[];
  return (
    <>
      <Topbar title="Audit trail" subtitle="200 dernières actions — journal non modifiable." />
      <div className="content">
        {rows.length === 0 ? (
          <div className="card empty">Aucune action enregistrée.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString("fr-FR", { timeZone: "UTC" })} UTC</td>
                    <td>{(r.user_id && names.get(r.user_id)) || "Système"}</td>
                    <td><span className="tag">{r.action}</span></td>
                    <td>{r.entity} <span className="helper">{r.entity_id.slice(0, 8)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
