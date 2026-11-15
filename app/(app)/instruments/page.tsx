import Link from "next/link";
import { InstrumentPreview } from "@/components/InstrumentPreview";
import { Topbar } from "@/components/Topbar";
import { MobileFilters } from "@/components/MobileFilters";
import { UrgencyTag, rowClass } from "@/components/UrgencyTag";
import { CATALOG } from "@/lib/calc/catalog";
import {
  ECHEANCE_LABEL, ECHEANCES, PAGE_SIZE, activeFilterCount, echeanceRange, instrumentHref, parseInstrumentQuery, sanitizeSearch, type SortColumn,
} from "@/lib/instrumentQuery";
import { CONFORMITES, STATUTS, statutLabel } from "@/lib/schemas";
import { canEdit, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { conformityWarning, instrumentUrgency, isRebut } from "@/lib/status";
import type { Instrument } from "@/lib/types";
import { fmtDate, todayIn } from "@/lib/dates";

type SP = Record<string, string | string[] | undefined>;
const COLUMNS: { key: SortColumn | "etat"; label: string }[] = [
  { key: "ref", label: "Référence" }, { key: "designation", label: "Désignation" }, { key: "batiment", label: "Localisation" },
  { key: "statut", label: "Statut" }, { key: "conformite", label: "Conformité" }, { key: "date_prochaine", label: "Échéance" }, { key: "etat", label: "État" },
];

export default async function InstrumentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const q = parseInstrumentQuery(sp);
  const supabase = await createClient();
  const today = todayIn(s.timeZone);

  let query = supabase.from("instruments").select("*", { count: "exact" }).is("deleted_at", null);
  const term = sanitizeSearch(q.q);
  if (term) query = query.or(["ref", "designation", "type_mesure", "batiment", "zone"].map((c) => `${c}.ilike.%${term}%`).join(","));
  if (q.statut) query = query.eq("statut", q.statut);
  if (q.conformite) query = query.eq("conformite", q.conformite);
  if (q.batiment) query = query.eq("batiment", q.batiment);
  if (q.zone) query = query.eq("zone", q.zone);
  if (q.type) query = query.eq("catalog_id", q.type);
  if (q.echeance) {
    const r = echeanceRange(q.echeance, today);
    if (r.lt) query = query.lt("date_prochaine", r.lt);
    if (r.gte) query = query.gte("date_prochaine", r.gte);
    if (r.lte) query = query.lte("date_prochaine", r.lte);
  }
  query = query.order(q.sort, { ascending: q.dir === "asc", nullsFirst: false }).order("ref", { ascending: true });
  const from = (q.page - 1) * PAGE_SIZE;
  const [{ data, count }, { data: places }] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabase.from("instruments").select("batiment, zone").is("deleted_at", null).limit(5000),
  ]);
  const rows = (data ?? []) as Instrument[];
  // Nombre de documents joints par instrument de la page (bouton « Aperçu »).
  const { data: attRows } = rows.length
    ? await supabase.from("attachments").select("instrument_id").in("instrument_id", rows.map((r) => r.id))
    : { data: [] as { instrument_id: string }[] };
  const docCount = new Map<string, number>();
  for (const a of (attRows ?? []) as { instrument_id: string }[]) docCount.set(a.instrument_id, (docCount.get(a.instrument_id) ?? 0) + 1);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const batiments = [...new Set((places ?? []).map((p) => p.batiment).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const zones = [...new Set((places ?? []).map((p) => p.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const filters = activeFilterCount(q);

  return (
    <>
      <Topbar
        title="Instruments"
        subtitle={`${total} instrument${total > 1 ? "s" : ""}${filters ? ` (${filters} filtre${filters > 1 ? "s" : ""})` : ""}`}
        actions={<><a className="btn small soft" href="/export/instruments.xlsx">Excel</a><a className="btn small soft" href="/export/instruments.pdf">PDF</a>{canEdit(s) && <Link className="btn small soft" href="/instruments/import">Importer (Excel)</Link>}{canEdit(s) && <Link className="btn small primary" href="/instruments/new">Ajouter un instrument</Link>}</>}
      />
      <div className="content stack">
        {sp.archive === "1" && <div className="notice ok" role="status">Instrument archivé. Un administrateur peut le restaurer depuis la Corbeille.</div>}
        <form className="card" role="search" style={{ padding: 14 }}>
          <input type="hidden" name="sort" value={q.sort} /><input type="hidden" name="dir" value={q.dir} />
          <div className="grid cols-4">
            <input className="input" name="q" defaultValue={q.q} placeholder="Rechercher (référence, désignation…)" aria-label="Rechercher" maxLength={100} />
            <MobileFilters count={filters - (q.q ? 1 : 0)}>
            <select className="input" name="statut" defaultValue={q.statut} aria-label="Statut"><option value="">Tous les statuts</option>{STATUTS.map((x) => <option key={x} value={x}>{statutLabel(x)}</option>)}</select>
            <select className="input" name="conformite" defaultValue={q.conformite} aria-label="Conformité"><option value="">Toutes conformités</option>{CONFORMITES.map((x) => <option key={x}>{x}</option>)}</select>
            <select className="input" name="echeance" defaultValue={q.echeance} aria-label="Échéance"><option value="">Toutes échéances</option>{ECHEANCES.map((x) => <option key={x} value={x}>{ECHEANCE_LABEL[x]}</option>)}</select>
            <select className="input" name="batiment" defaultValue={q.batiment} aria-label="Bâtiment"><option value="">Tous les bâtiments</option>{batiments.map((x) => <option key={x}>{x}</option>)}</select>
            <select className="input" name="zone" defaultValue={q.zone} aria-label="Zone"><option value="">Toutes les zones</option>{zones.map((x) => <option key={x}>{x}</option>)}</select>
            <select className="input" name="type" defaultValue={q.type} aria-label="Type d'instrument"><option value="">Tous les types</option>{CATALOG.filter((c) => c.id !== "autre").map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn soft" style={{ flex: 1, justifyContent: "center" }}>Filtrer</button>
              {filters > 0 && <Link className="btn soft" href="/instruments">Réinitialiser</Link>}
            </div>
            </MobileFilters>
          </div>
        </form>

        {rows.length === 0 ? (
          <div className="card empty">Aucun instrument ne correspond à ces critères.</div>
        ) : (
          <div className="table-wrap">
            <table className="cards">
              <thead>
                <tr>
                  {COLUMNS.map((c) => {
                    if (c.key === "etat") return <th key={c.key}>{c.label}</th>;
                    const active = q.sort === c.key;
                    const next = active && q.dir === "asc" ? "desc" : "asc";
                    return (
                      <th key={c.key} aria-sort={active ? (q.dir === "asc" ? "ascending" : "descending") : "none"}>
                        <Link href={instrumentHref(q, { sort: c.key, dir: next, page: 1 })} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", gap: 4 }}>
                          {c.label}<span aria-hidden style={{ opacity: active ? 1 : 0.3 }}>{active ? (q.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                        </Link>
                      </th>
                    );
                  })}
                  <th><span className="sr-only">Aperçu</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const u = instrumentUrgency(i);
                  return (
                    <tr key={i.id} className={rowClass(u)}>
                      <td className="c-main"><Link href={`/instruments/${i.id}`}>{i.ref}</Link></td>
                      <td className="c-sub">{i.designation}</td>
                      <td data-label="Localisation">{[i.batiment, i.zone].filter(Boolean).join(" · ") || "—"}</td>
                      <td data-label="Statut">{statutLabel(i.statut)}</td>
                      <td data-label="Conformité">{i.conformite}{!isRebut(i.statut) && conformityWarning(i.conformite, i.date_prochaine) && <> <span className="tag orange" title="Échéance dépassée : conformité à revérifier">À revérifier</span></>}</td>
                      <td data-label="Échéance">{fmtDate(i.date_prochaine)}</td>
                      <td className="c-badge"><UrgencyTag urgency={u} statut={i.statut} /></td>
                      <td className="c-act"><InstrumentPreview id={i.id} label={`${i.ref} ${i.designation}`} count={docCount.get(i.id) ?? 0} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            {q.page > 1 ? <Link className="btn small soft" href={instrumentHref(q, { page: 1 })}>« Début</Link> : null}
            {q.page > 1 ? <Link className="btn small soft" href={instrumentHref(q, { page: q.page - 1 })}>← Précédent</Link> : null}
            <span className="helper">Page {Math.min(q.page, pages)} / {pages} · {from + 1}–{Math.min(from + PAGE_SIZE, total)} sur {total}</span>
            {q.page < pages ? <Link className="btn small soft" href={instrumentHref(q, { page: q.page + 1 })}>Suivant →</Link> : null}
            {q.page < pages ? <Link className="btn small soft" href={instrumentHref(q, { page: pages })}>Fin »</Link> : null}
          </nav>
        )}
      </div>
    </>
  );
}
