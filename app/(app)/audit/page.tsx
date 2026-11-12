import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/dates";

const PAGE_SIZE = 50;
type Row = { id: number; user_id: string | null; action: string; entity: string; entity_id: string; created_at: string };
type Q = { page?: string; action?: string; entity?: string; from?: string; to?: string };

const safeToken = (v?: string) => (v && /^[a-z_]{1,40}$/.test(v) ? v : "");
const safeDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export default async function AuditPage({ searchParams }: { searchParams: Promise<Q> }) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(q.page) || 1));
  const f = { action: safeToken(q.action), entity: safeToken(q.entity), from: safeDate(q.from), to: safeDate(q.to) };
  const supabase = await createClient();
  let query = supabase.from("audit_log").select("id, user_id, action, entity, entity_id, created_at", { count: "exact" }).order("id", { ascending: false });
  if (f.action) query = query.eq("action", f.action);
  if (f.entity) query = query.eq("entity", f.entity);
  if (f.from) query = query.gte("created_at", `${f.from}T00:00:00Z`);
  if (f.to) query = query.lt("created_at", `${f.to}T23:59:59.999Z`);
  const [{ data, count }, { data: members }] = await Promise.all([
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("profiles").select("user_id, display_name"),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const rows = (data ?? []) as Row[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (p: number) => { const sp = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => v && sp.set(k, v)); sp.set("page", String(p)); return `/audit?${sp}`; };
  return (
    <>
      <Topbar title="Audit trail" subtitle={`${count ?? 0} action${(count ?? 0) > 1 ? "s" : ""} — journal non modifiable.`}
        actions={<><a className="btn small soft" href="/export/audit.xlsx">Excel</a><a className="btn small soft" href="/export/audit.pdf">PDF</a></>} />
      <div className="content stack">
        <form className="toolbar" role="search">
          <select className="input" name="action" defaultValue={f.action} aria-label="Action" style={{ maxWidth: 170 }}>
            <option value="">Toutes les actions</option><option value="insert">Création</option><option value="update">Modification</option><option value="delete">Suppression</option><option value="platform_update">Plateforme</option>
          </select>
          <select className="input" name="entity" defaultValue={f.entity} aria-label="Objet" style={{ maxWidth: 190 }}>
            <option value="">Tous les objets</option><option value="instruments">Instruments</option><option value="interventions">Interventions</option><option value="prestataires">Prestataires</option><option value="profiles">Utilisateurs</option><option value="attachments">Documents</option><option value="inventory_runs">Inventaires</option><option value="tenants">Entreprise</option>
          </select>
          <input className="input" type="date" name="from" defaultValue={f.from} aria-label="Du" style={{ maxWidth: 160 }} />
          <input className="input" type="date" name="to" defaultValue={f.to} aria-label="Au" style={{ maxWidth: 160 }} />
          <button className="btn small soft">Filtrer</button>
        </form>
        {rows.length === 0 ? <div className="card empty">Aucune action pour ces critères.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Objet</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.created_at)}</td>
                <td>{(r.user_id && names.get(r.user_id)) || "Système"}</td>
                <td><span className="tag">{r.action}</span></td>
                <td>{r.entity} <span className="helper">{r.entity_id.slice(0, 8)}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
            {page > 1 ? <Link className="btn small soft" href={href(page - 1)}>← Précédent</Link> : <span />}
            <span className="helper">Page {page} / {pages}</span>
            {page < pages ? <Link className="btn small soft" href={href(page + 1)}>Suivant →</Link> : <span />}
          </div>
        )}
      </div>
    </>
  );
}
