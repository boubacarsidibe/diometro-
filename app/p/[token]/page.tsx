import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { UrgencyTag } from "@/components/UrgencyTag";
import { createClient } from "@/lib/supabase/server";
import { conformityWarning, instrumentUrgency, isRebut } from "@/lib/status";
import { statutLabel } from "@/lib/schemas";
import { fmtDate } from "@/lib/dates";

// Toujours à jour : aucune mise en cache, la page relit la base à chaque scan.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Fiche instrument · DIOMETRO", robots: { index: false, follow: false } };

type Fiche = { ref: string; designation: string; statut: string; conformite: string; date_etalonnage: string | null; date_prochaine: string | null; lieu: string | null };
const fmt = (d: string | null) => fmtDate(d);

// Page publique en lecture seule. Les 7 données ci-dessous viennent d'une fonction SQL dédiée (jamais d'accès direct aux tables).
export default async function PublicFichePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let fiche: Fiche | null = null;
  if (z.uuid().safeParse(token).success) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("public_fiche", { p_token: token });
    fiche = Array.isArray(data) ? ((data[0] as Fiche | undefined) ?? null) : null;
  }
  return (
    <main className="welcome">
      <div className="auth-box">
        <div className="brand">DIO<span>METRO</span></div>
        {!fiche ? (
          <><p className="lead">Lien invalide ou désactivé.</p><div className="notice err">Ce QR code n&apos;est plus actif. Demandez une nouvelle étiquette à votre responsable métrologie.</div></>
        ) : (
          <>
            <h1 style={{ fontSize: 22, margin: "14px 0 2px" }}>{fiche.ref}</h1>
            <p style={{ color: "var(--text-soft)", marginBottom: 16 }}>{fiche.designation}</p>
            <dl className="details p-details">
              <dt>Statut</dt><dd>{statutLabel(fiche.statut)}</dd>
              <dt>Conformité</dt><dd>{fiche.conformite}</dd>
              <dt>Dernier étalonnage</dt><dd>{fmt(fiche.date_etalonnage)}</dd>
              <dt>Prochaine échéance</dt><dd>{fmt(fiche.date_prochaine)} {(fiche.date_prochaine || isRebut(fiche.statut)) && <UrgencyTag urgency={instrumentUrgency(fiche)} statut={fiche.statut} />}</dd>
              <dt>Lieu</dt><dd>{fiche.lieu ?? "—"}</dd>
            </dl>
            {!isRebut(fiche.statut) && conformityWarning(fiche.conformite, fiche.date_prochaine) && <div className="notice err" role="note" style={{ marginTop: 14, marginBottom: 0 }}>{conformityWarning(fiche.conformite, fiche.date_prochaine)}</div>}
            <p className="helper" style={{ marginTop: 14 }}>Informations à jour à la date de consultation.</p>
            <div className="auth-links"><Link href="/login">Connexion</Link></div>
          </>
        )}
      </div>
    </main>
  );
}
