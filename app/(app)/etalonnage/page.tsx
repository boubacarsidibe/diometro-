import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Filterable } from "@/components/Filterable";
import { CATALOG, withOrganisme } from "@/lib/calc/catalog";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const METHOD: Record<string, string> = { pipette: "Calculateur pipette (ISO 8655)", pt100: "Calculateur Pt100 (GUM)", direct: "Comparaison directe" };

export default async function EtalonnagePage() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("id, ref, designation, catalog_id").is("deleted_at", null).eq("statut", "En service").order("ref");
  const instruments = data ?? [];
  return (
    <>
      <Topbar title="Étalonnage et vérification" subtitle="Procédures par type d'instrument et calculateurs de conformité." />
      <div className="content stack">
        <div className="card">
          <h2>Étalonner un instrument</h2>
          {instruments.length === 0 ? <div className="empty">Aucun instrument en service.</div> : (
            <Filterable placeholder="Rechercher (référence, désignation…)" unit={["instrument", "instruments"]}
              selects={[{ key: "type", label: "Tous les types", options: CATALOG.filter((c) => instruments.some((i) => i.catalog_id === c.id)).map((c) => ({ value: c.id, label: c.nom })) }]}>
            <div className="table-wrap"><table>
              <thead><tr><th>Référence</th><th>Désignation</th><th>Type</th><th /></tr></thead>
              <tbody>{instruments.map((i) => {
                const c = CATALOG.find((x) => x.id === i.catalog_id);
                return (
                  <tr key={i.id} data-f-type={i.catalog_id || ""}><td>{i.ref}</td><td>{i.designation}</td><td>{c ? `${c.icone} ${c.nom}` : <span className="helper">Non précisé</span>}</td>
                    <td><Link className="btn small primary" href={`/instruments/${i.id}/etalonnage${c ? `?type=${c.id}` : ""}`}>Étalonner</Link></td></tr>
                );
              })}</tbody>
            </table></div>
            </Filterable>
          )}
        </div>
        <div className="card">
          <h2>Procédures par type d&apos;instrument</h2>
          <div className="faq">
            {CATALOG.filter((c) => c.id !== "autre").map((c) => (
              <details key={c.id}>
                <summary>{c.icone} {c.nom} <span className="tag" style={{ marginLeft: 8 }}>{c.calculateur ? METHOD[c.calculateur] : "Saisie manuelle"}</span></summary>
                <p><strong>Norme :</strong> {c.norme}</p>
                {c.compatibilite && <p>{c.compatibilite}</p>}
                {c.conditions.length > 0 && (<><p><strong>Conditions et matériel</strong></p><ul style={{ margin: "6px 0 0 20px" }}>{c.conditions.map((x, k) => <li key={k}>{withOrganisme(x, s.tenant.accreditation_label)}</li>)}</ul></>)}
                {c.demarche.length > 0 && (<><p style={{ marginTop: 10 }}><strong>Démarche</strong></p><ol style={{ margin: "6px 0 0 20px" }}>{c.demarche.map((x, k) => <li key={k}>{withOrganisme(x, s.tenant.accreditation_label)}</li>)}</ol></>)}
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
