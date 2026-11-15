import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Filterable } from "@/components/Filterable";
import { CATALOG } from "@/lib/calc/catalog";
import { UrgencyTag, rowClass } from "@/components/UrgencyTag";
import { fmtDate } from "@/lib/dates";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, urgencyOf, type Urgency } from "@/lib/status";
import type { Instrument } from "@/lib/types";

// Trois paliers, du plus urgent au moins urgent. Dans chaque palier : le plus gros retard (ou l'échéance la plus proche) en premier.
const TIERS: { key: Urgency; title: string; hint: string; empty: string }[] = [
  { key: "expire", title: "Déjà dépassés", hint: "Étalonnages en retard : instruments à ne plus utiliser sans vérification.", empty: "Aucun étalonnage en retard." },
  { key: "urgent", title: "Moins de 15 jours", hint: "À planifier tout de suite.", empty: "Aucune échéance dans les 15 prochains jours." },
  { key: "bientot", title: "Entre 15 et 30 jours", hint: "À anticiper.", empty: "Aucune échéance entre 15 et 30 jours." },
];

export default async function AlertsPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).eq("statut", "En service").order("date_prochaine", { ascending: true });
  const rows = (data ?? []) as Instrument[];
  const total = rows.filter((i) => TIERS.some((t) => t.key === urgencyOf(i.date_prochaine))).length;
  const alerted = rows.filter((i) => TIERS.some((t) => t.key === urgencyOf(i.date_prochaine)));
  const batiments = [...new Set(alerted.map((i) => i.batiment).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const types = CATALOG.filter((c) => alerted.some((i) => i.catalog_id === c.id));
  return (
    <>
      <Topbar title="Alertes" subtitle={total === 0 ? "Tous les instruments en service sont à jour." : `${total} instrument${total > 1 ? "s" : ""} en service à étalonner ou en retard.`} />
      <div className="content">
        <Filterable placeholder="Rechercher (référence, désignation, lieu…)" unit={["alerte", "alertes"]}
          selects={[
            { key: "batiment", label: "Tous les bâtiments", options: batiments.map((b) => ({ value: b, label: b })) },
            { key: "type", label: "Tous les types", options: types.map((c) => ({ value: c.id, label: c.nom })) },
          ]}>
        <div className="stack">
        {TIERS.map((t) => {
          const list = rows.filter((i) => urgencyOf(i.date_prochaine) === t.key);
          return (
            <section className="card" key={t.key} aria-labelledby={`tier-${t.key}`}>
              <h2 id={`tier-${t.key}`} style={{ marginBottom: 4 }}>{t.title} <UrgencyTag urgency={t.key} /> <span className="helper">({list.length})</span></h2>
              <p className="helper" style={{ marginBottom: 12 }}>{t.hint}</p>
              {list.length === 0 ? <div className="empty">{t.empty}</div> : (
                <div className="table-wrap">
                  <table className="cards">
                    <thead><tr><th>Référence</th><th>Désignation</th><th>Localisation</th><th>Échéance</th><th>Délai</th><th /></tr></thead>
                    <tbody>
                      {list.map((i) => {
                        const d = daysUntil(i.date_prochaine) ?? 0;
                        return (
                          <tr key={i.id} className={rowClass(t.key)} data-f-batiment={i.batiment || ""} data-f-type={i.catalog_id || ""}>
                            <td className="c-main"><strong>{i.ref}</strong></td>
                            <td className="c-sub">{i.designation}</td>
                            <td data-label="Localisation">{[i.batiment, i.zone].filter(Boolean).join(" · ") || "—"}</td>
                            <td data-label="Échéance">{fmtDate(i.date_prochaine)}</td>
                            <td className="c-badge"><strong>{d < 0 ? `${-d} j de retard` : `dans ${d} j`}</strong></td>
                            <td className="c-act" style={{ textAlign: "right" }}><Link className="btn small soft" href={`/instruments/${i.id}`}>Ouvrir la fiche</Link></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
        </div>
        </Filterable>
      </div>
    </>
  );
}
