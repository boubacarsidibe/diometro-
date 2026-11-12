import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportWizard } from "@/components/ImportWizard";
import { Topbar } from "@/components/Topbar";
import { IMPORT_COLUMNS } from "@/lib/import";
import { canEdit, requireSession } from "@/lib/session";
import { checkImport, runImport } from "./actions";

export default async function ImportPage() {
  const s = await requireSession();
  if (!canEdit(s)) redirect("/instruments");
  return (
    <>
      <Topbar title="Importer le parc depuis Excel" subtitle="Modèle à remplir, contrôle des erreurs avant import, puis rapport."
        actions={<Link className="btn small soft" href="/instruments">Retour aux instruments</Link>} />
      <div className="content stack">
        <div className="card">
          <h2>1. Télécharger le modèle</h2>
          <p className="helper" style={{ marginBottom: 10 }}>Une ligne par instrument. Seules la <strong>référence</strong> et la <strong>désignation</strong> sont obligatoires ; les dates s&apos;écrivent jj/mm/aaaa. Les colonnes à choix (statut, conformité, unité, type…) proposent une liste déroulante. Une feuille « Exemple » et un mode d&apos;emploi sont inclus.</p>
          <a className="btn primary" href="/export/modele-import.xlsx">Télécharger le modèle Excel</a>
          <details style={{ marginTop: 12 }}>
            <summary className="helper" style={{ cursor: "pointer" }}>Voir les {IMPORT_COLUMNS.length} colonnes du modèle</summary>
            <ul className="helper" style={{ margin: "8px 0 0 18px" }}>{IMPORT_COLUMNS.map((c) => <li key={c.key}><strong>{c.header}</strong> : {c.help}</li>)}</ul>
          </details>
        </div>
        <ImportWizard check={checkImport} run={runImport} />
      </div>
    </>
  );
}
