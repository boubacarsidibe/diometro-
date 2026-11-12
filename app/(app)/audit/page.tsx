import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/dates";
import { auditUser, describeAudit, type AuditRow } from "@/lib/audit";

const PAGE_SIZE = 50;
type Q = { page?: string; action?: string; entity?: string; from?: string; to?: string; user?: string };

const safeToken = (v?: string) => (v && /^[a-z_]{1,40}$/.test(v) ? v : "");
const safeDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const safeUuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : "");

export default async function AuditPage({ searchParams }: { searchParams: Promise<Q> }) {
  await requireAdmin();
  const q = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(q.page) || 1));
  const f = { action: safeToken(q.action), entity: safeToken(q.entity), from: safeDate(q.from), to: safeDate(q.to), user: safeUuid(q.user) };
  const supabase = await createClient();
  let query = supabase.from("audit_log").select("id, user_id, action, entity, entity_id, created_at, detail", { count: "exact" }).order("id", { ascending: false });
  if (f.action) query = query.eq("action", f.action);
  if (f.entity) query = query.eq("entity", f.entity);
  if (f.user) query = query.eq("user_id", f.user);
  if (f.from) query = query.gte("created_at", `${f.from}T00:00:00Z`);
  if (f.to) query = query.lt("created_at", `${f.to}T23:59:59.999Z`);
  const [{ data, count }, { data: members }] = await Promise.all([
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("profiles").select("user_id, display_name"),
  ]);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const rows = (data ?? []) as AuditRow[];
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
          <select className="input" name="user" defaultValue={f.user} aria-label="Utilisateur" style={{ maxWidth: 190 }}>
            <option value="">Tous les utilisateurs</option>{(members ?? []).map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
          </select>
          <input className="input" type="date" name="from" defaultValue={f.from} aria-label="Du" style={{ maxWidth: 160 }} />
          <input className="input" type="date" name="to" defaultValue={f.to} aria-label="Au" style={{ maxWidth: 160 }} />
          <button className="btn small soft">Filtrer</button>
        </form>
        {rows.length === 0 ? <div className="card empty">Aucune action pour ces critères.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Date (heure de Dakar)</th><th>Utilisateur</th><th>Action</th><th>Détail</th></tr></thead>
            <tbody>{rows.map((r) => {
              const v = describeAudit(r);
              return (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td>
                  <td>{auditUser(r.user_id, names)}</td>
                  <td><strong>{v.label}</strong>{v.object && <div className="helper">{v.object}</div>}</td>
                  <td>{v.changes.length === 0 ? <span className="helper">—</span> : (
                    <ul className="audit-changes">{v.changes.map((c) => <li key={c.field}><span>{c.field}</span> : {c.before ? <><s>{c.before}</s> → </> : null}<strong>{c.after}</strong></li>)}</ul>
                  )}</td>
                </tr>
              );
            })}</tbody>
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
