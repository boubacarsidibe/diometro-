import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { canEdit, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Prestataire } from "@/lib/types";

export default async function PrestatairesPage({ searchParams }: { searchParams: Promise<{ q?: string; cofrac?: string; archive?: string }> }) {
  const s = await requireSession();
  const { q = "", cofrac, archive } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("prestataires").select("*").is("deleted_at", null).order("nom");
  const term = q.trim().toLowerCase().slice(0, 100);
  const rows = ((data ?? []) as Prestataire[]).filter(
    (p) => (!term || [p.nom, p.contact_nom, p.email, ...p.domaines].some((f) => f.toLowerCase().includes(term))) && (cofrac !== "1" || p.cofrac),
  );
  return (
    <>
      <Topbar title="Prestataires" subtitle={`${rows.length} prestataire${rows.length > 1 ? "s" : ""}`} actions={<><Link className="btn small soft" href="/prestataires/comparateur">Comparateur</Link>{canEdit(s) && <Link className="btn small primary" href="/prestataires/new">Ajouter un prestataire</Link>}</>} />
      <div className="content">
        {archive === "1" && <div className="notice ok" role="status">Prestataire archivé. Un administrateur peut le restaurer depuis la Corbeille.</div>}
        <form className="toolbar" role="search">
          <input className="input" name="q" defaultValue={q} placeholder="Rechercher (nom, contact, domaine…)" aria-label="Rechercher" maxLength={100} />
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="cofrac" value="1" defaultChecked={cofrac === "1"} /> {s.tenant.accreditation_label} uniquement</label>
          <button className="btn small soft">Filtrer</button>
        </form>
        {rows.length === 0 ? (
          <div className="card empty">Aucun prestataire.</div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Nom</th><th>Domaines</th><th>Contact</th><th>{s.tenant.accreditation_label}</th><th>Délai</th><th>Note</th><th>État</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/prestataires/${p.id}`}>{p.nom}</Link><div className="helper">{p.type}</div></td>
                <td>{p.domaines.join(", ") || "—"}</td>
                <td>{p.contact_nom || "—"}<div className="helper">{p.telephone || p.email}</div></td>
                <td>{p.cofrac ? <span className="tag green">{s.tenant.accreditation_label}</span> : "—"}</td>
                <td>{p.delai_moyen_jours != null ? `${p.delai_moyen_jours} j` : "—"}</td>
                <td><span className="stars" aria-label={`${p.note_interne} sur 5`}>{"★".repeat(p.note_interne)}{"☆".repeat(5 - p.note_interne)}</span></td>
                <td>{p.actif ? <span className="tag green">Actif</span> : <span className="tag">Inactif</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
