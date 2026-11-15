import type { Metadata } from "next";
import { INDEXABLE } from "@/lib/seo";
import { Missing } from "@/components/LegalLayout";
import { LEGAL, missingLegalFields } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales · DIOMETRO", robots: INDEXABLE };

export default function MentionsLegalesPage() {
  const L = LEGAL;
  const v = (x: string | null, label: string) => x ?? <Missing>{label}</Missing>;
  return (
    <article className="prose">
      <h1>Mentions légales</h1>
      {missingLegalFields().length > 0 && <div className="notice err">Document provisoire : certaines informations de l&apos;éditeur restent à renseigner.</div>}
      <h2>Éditeur du service</h2>
      <p>Le service DIOMETRO est édité par <strong>{v(L.nom, "raison sociale")}</strong>, {v(L.forme, "forme juridique")}.</p>
      <ul>
        <li>Siège social : {v(L.adresse, "adresse")}</li>
        <li>Immatriculation (NINEA / RCCM) : {v(L.ninea, "numéro")}</li>
        <li>Directeur de la publication : {v(L.directeur, "nom")}</li>
        <li>Contact : {v(L.email, "email")}{L.telephone ? ` · ${L.telephone}` : null}</li>
      </ul>
      <h2>Hébergement</h2>
      <ul>
        <li>Application web : <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.</li>
        <li>Base de données, authentification et stockage des fichiers : <strong>Supabase Inc.</strong> (région Europe, Londres).</li>
      </ul>
      <h2>Propriété intellectuelle</h2>
      <p>La marque DIOMETRO, l&apos;interface, les textes et le code du service sont protégés. Toute reproduction non autorisée est interdite. Les données saisies par les clients restent leur propriété.</p>
      <h2>Données personnelles</h2>
      <p>Le traitement des données personnelles est décrit dans la <a href="/confidentialite">politique de confidentialité</a>.</p>
      <h2>Responsabilité</h2>
      <p>DIOMETRO est un outil d&apos;aide au suivi métrologique. Les décisions de conformité et les obligations réglementaires restent sous la responsabilité de l&apos;utilisateur. Voir les <a href="/cgu">conditions générales d&apos;utilisation</a>.</p>
      <p className="helper">Dernière mise à jour : {L.version}</p>
    </article>
  );
}
