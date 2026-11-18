import Link from "next/link";
import { fmtDateTime } from "@/lib/dates";
import { journalChanges, type JournalEntry, planName } from "@/lib/console";

// Journal des actions : inscriptions, modifications d'abonnement (avant → après) et relances envoyées.
export function JournalList({ entries, ready, tz, showTenant = true }: { entries: JournalEntry[]; ready: boolean; tz: string; showTenant?: boolean }) {
  if (!ready) return <p className="cs-muted">Le journal sera disponible dès que la mise à jour de la base (migration 0015) aura été appliquée.</p>;
  if (!entries.length) return <p className="cs-muted">Aucune action enregistrée pour l&apos;instant.</p>;
  return (
    <ol className="cs-log">
      {entries.map((e, i) => {
        const changes = journalChanges(e, planName);
        const what = e.kind === "inscription" ? "Inscription" : e.kind === "relance" ? "Relance envoyée" : "Abonnement modifié";
        return (
          <li key={i} className={`k-${e.kind}`}>
            <div className="cs-log-h">
              <b>{what}</b>
              {showTenant && <> · <Link className="cs-link" href={`/admin/entreprises/${e.tenant_id}`}>{e.tenant_name}</Link></>}
              <span className="cs-muted"> · {fmtDateTime(e.at, "—", tz)}{e.actor ? ` · par ${e.actor}` : ""}</span>
            </div>
            {e.kind === "relance" && <div className="cs-muted">« {String(e.detail.subject ?? "")} » à {String(e.detail.to ?? "")}</div>}
            {changes.length > 0 && (
              <div className="cs-chgs">{changes.map((c) => <span key={c.label} className="cs-chg">{c.label} : <s>{c.before}</s> → <b>{c.after}</b></span>)}</div>
            )}
            {e.kind === "modification" && !changes.length && <div className="cs-muted">Enregistré sans changement.</div>}
          </li>
        );
      })}
    </ol>
  );
}
