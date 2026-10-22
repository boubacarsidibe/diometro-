import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { UrgencyTag } from "@/components/UrgencyTag";
import { createClient } from "@/lib/supabase/server";
import { urgencyOf } from "@/lib/status";

export const metadata: Metadata = { title: "Instrument · DIOMETRO", robots: { index: false, follow: false } };

// Page publique en lecture seule : données minimales, fournies par une fonction SQL dédiée (jamais d'accès direct aux tables).
export default async function PublicInstrumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = z.uuid().safeParse(token).success;
  let row: { ref: string; designation: string; type_mesure: string; statut: string; conformite: string; date_etalonnage: string | null; date_prochaine: string | null; entreprise: string } | null = null;
  if (valid) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("public_instrument", { p_token: token });
    row = Array.isArray(data) ? (data[0] ?? null) : null;
  }
  return (
    <main className="welcome">
      <div className="auth-box">
        <div className="brand">DIO<span>METRO</span></div>
        {!row ? (
          <><p className="lead">Lien invalide ou désactivé.</p><div className="notice err">Ce QR code n&apos;est plus actif. Demandez un nouveau lien à votre responsable métrologie.</div></>
        ) : (
          <>
            <p className="lead">{row.entreprise}</p>
            <h1 style={{ fontSize: 20, marginBottom: 4 }}>{row.ref}</h1>
            <p style={{ color: "var(--text-soft)", marginBottom: 14 }}>{row.designation}</p>
            <dl className="details" style={{ gridTemplateColumns: "140px 1fr" }}>
              <dt>Type de mesure</dt><dd>{row.type_mesure || "—"}</dd>
              <dt>Statut</dt><dd>{row.statut}</dd>
              <dt>Conformité</dt><dd>{row.conformite}</dd>
              <dt>Dernier étalonnage</dt><dd>{row.date_etalonnage ?? "—"}</dd>
              <dt>Prochaine échéance</dt><dd>{row.date_prochaine ?? "—"} {row.date_prochaine && <UrgencyTag urgency={urgencyOf(row.date_prochaine)} />}</dd>
            </dl>
            <div className="auth-links"><Link href="/login">Se connecter pour plus de détails</Link></div>
          </>
        )}
      </div>
    </main>
  );
}
