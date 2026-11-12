import { BrandingForm } from "@/components/BrandingForm";
import { Topbar } from "@/components/Topbar";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TestEmailButton } from "@/components/TestEmailButton";
import { saveBranding, sendTestEmail } from "./actions";
import { fmtDate } from "@/lib/dates";

export default async function ParametresPage() {
  const s = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("plan, plan_expires_at, alerts_enabled, max_instruments, sector, phone").eq("id", s.tenant.id).single();
  return (
    <>
      <Topbar title="Paramètres de l'entreprise" subtitle="Nom, couleur, logo et alertes." />
      <div className="content stack">
        <div className="card">
          <h2>Identité visuelle et alertes</h2>
          <BrandingForm action={saveBranding} name={s.tenant.name} accent={s.tenant.accent} alertsEnabled={data?.alerts_enabled ?? true} logo={s.tenant.logo_data} accreditation={s.tenant.accreditation_label} currency={s.tenant.currency} sector={data?.sector ?? ""} phone={data?.phone ?? ""} buildings={s.tenant.buildings} />
        </div>
        <div className="card">
          <h2>Alertes par email</h2>
          <p className="helper" style={{ marginBottom: 10 }}>Envoie un message de test à votre adresse ({s.email}) pour vérifier que l&apos;envoi d&apos;emails est correctement configuré.</p>
          <TestEmailButton action={sendTestEmail} />
        </div>
        <div className="card">
          <h2>Abonnement</h2>
          <dl className="details">
            <dt>Formule</dt><dd style={{ textTransform: "capitalize" }}>{data?.plan ?? "—"}</dd>
            <dt>Instruments autorisés</dt><dd>{data?.max_instruments ?? "Illimité"}</dd>
            <dt>Valable jusqu&apos;au</dt><dd>{fmtDate(data?.plan_expires_at, "Sans limite")}</dd>
          </dl>
          <p className="helper" style={{ marginTop: 10 }}>Pour changer de formule ou renouveler, contactez votre fournisseur DIOMETRO.</p>
        </div>
      </div>
    </>
  );
}
