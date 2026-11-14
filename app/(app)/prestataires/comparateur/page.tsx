import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { money } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Prestataire } from "@/lib/types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function ComparateurPage({ searchParams }: { searchParams: Promise<{ domaine?: string }> }) {
  const s = await requireSession();
  const { domaine = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("prestataires").select("*").is("deleted_at", null).eq("actif", true);
  const all = (data ?? []) as Prestataire[];
  const domaines = [...new Set(all.flatMap((p) => p.domaines))].sort((a, b) => a.localeCompare(b, "fr"));
  const wanted = domaine.trim().slice(0, 60);
  const rows = (wanted ? all.filter((p) => p.domaines.some((d) => norm(d) === norm(wanted))) : all)
    // Accrédités d'abord, puis meilleure note, puis délai le plus court.
    .sort((a, b) => Number(b.cofrac) - Number(a.cofrac) || b.note_interne - a.note_interne || (a.delai_moyen_jours ?? 999) - (b.delai_moyen_jours ?? 999));
  const tarif = (p: Prestataire) => {
    const g = wanted ? p.grille_tarifs.find((x) => norm(x.typeMesure) === norm(wanted)) : undefined;
    return g ? `${money(g.prix, p.devise)}${g.unite ? ` / ${g.unite}` : ""}` : p.tarif_horaire != null ? `${money(p.tarif_horaire, p.devise)} / h` : "—";
  };
  return (
    <>
      <Topbar title="Comparateur de prestataires" subtitle="Pour un domaine de mesure donné" />
      <div className="content stack">
        <form className="toolbar" role="search">
          <select className="input" name="domaine" defaultValue={wanted} aria-label="Domaine de mesure" style={{ maxWidth: 320 }}>
            <option value="">Tous les domaines</option>{domaines.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button className="btn small soft">Comparer</button>
        </form>
        {rows.length === 0 ? <div className="card empty">Aucun prestataire actif pour ce domaine.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Prestataire</th><th>{s.tenant.accreditation_label}</th><th>Délai moyen</th><th>Tarif</th><th>Note</th><th>Contact</th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/prestataires/${p.id}`}>{p.nom}</Link><div className="helper">{p.domaines.join(", ")}</div></td>
                <td>{p.cofrac ? <span className="tag green">Accrédité</span> : <span className="tag">Non</span>}</td>
                <td>{p.delai_moyen_jours != null ? `${p.delai_moyen_jours} j` : "—"}</td><td>{tarif(p)}</td>
                <td><span className="stars" aria-label={`${p.note_interne} sur 5`}>{"★".repeat(p.note_interne)}{"☆".repeat(5 - p.note_interne)}</span></td>
                <td>{p.contact_nom || "—"}<div className="helper">{p.telephone || p.email}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
