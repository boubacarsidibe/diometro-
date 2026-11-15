import { BrandingForm } from "@/components/BrandingForm";
import { PlanPicker } from "@/components/PlanPicker";
import { Topbar } from "@/components/Topbar";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TestEmailButton } from "@/components/TestEmailButton";
import { requestPlan, saveBranding, sendTestEmail } from "./actions";
import { fmtDate } from "@/lib/dates";
import { money } from "@/lib/money";
import { OFFERS } from "@/lib/plans";
import { PLANS } from "@/lib/schemas";
import { daysUntil } from "@/lib/status";

export default async function ParametresPage() {
  const s = await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { count: used }, { data: places }] = await Promise.all([
    supabase.from("tenants").select("plan, plan_expires_at, alerts_enabled, max_instruments, sector, phone").eq("id", s.tenant.id).single(),
    supabase.from("instruments").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("instruments").select("batiment").is("deleted_at", null).limit(10000),
  ]);
  // Nombre d'instruments par bâtiment : prévient avant de retirer un bâtiment encore utilisé.
  const buildingUsage: Record<string, number> = {};
  for (const p of (places ?? []) as { batiment: string | null }[]) if (p.batiment) buildingUsage[p.batiment] = (buildingUsage[p.batiment] ?? 0) + 1;
  const plan = data?.plan ?? "essai";
  const planName = PLANS.find((p) => p.id === plan)?.nom ?? plan;
  const left = daysUntil(data?.plan_expires_at);
  const max = data?.max_instruments ?? null;
  const offers = OFFERS.map((o) => ({ id: o.id, nom: o.nom, cible: o.cible, instruments: o.instruments, prix: o.prix ? `${money(o.prix.mensuel, "XOF")} HT / mois` : null }));
  return (
    <>
      <Topbar title="Paramètres de l'entreprise" subtitle="Nom, logo, bâtiments, alertes et abonnement." />
      <div className="content stack">
        <div className="card">
          <h2>Identité visuelle et alertes</h2>
          <BrandingForm action={saveBranding} name={s.tenant.name} alertsEnabled={data?.alerts_enabled ?? true} logo={s.tenant.logo_data} accreditation={s.tenant.accreditation_label} currency={s.tenant.currency} sector={data?.sector ?? ""} phone={data?.phone ?? ""} buildings={s.tenant.buildings} buildingUsage={buildingUsage} timeZone={s.timeZone} />
        </div>
        <div className="card">
          <h2>Alertes par email</h2>
          <p className="helper" style={{ marginBottom: 10 }}>Envoie un message de test à votre adresse ({s.email}) pour vérifier que l&apos;envoi d&apos;emails est correctement configuré.</p>
          <TestEmailButton action={sendTestEmail} />
        </div>
        <div className="card">
          <h2>Abonnement</h2>
          {plan === "essai" && left !== null && (
            <div className={`notice ${left < 0 ? "err" : "ok"}`} role="status">
              {left < 0
                ? <>Votre essai gratuit est terminé depuis {-left} jour{-left > 1 ? "s" : ""} : le compte est en lecture seule. Choisissez une formule ci-dessous pour réactiver l&apos;écriture. Vos données sont conservées.</>
                : <><strong>Essai gratuit : {left} jour{left > 1 ? "s" : ""} restant{left > 1 ? "s" : ""}</strong> (jusqu&apos;au {fmtDate(data?.plan_expires_at)}). Toutes les fonctionnalités, jusqu&apos;à {max ?? 50} instruments.</>}
            </div>
          )}
          <dl className="details" style={{ marginBottom: 16 }}>
            <dt>Formule</dt><dd>{planName}</dd>
            <dt>Instruments</dt><dd>{used ?? 0}{max !== null ? ` sur ${max} autorisés` : " (illimité)"}</dd>
            <dt>Valable jusqu&apos;au</dt><dd>{fmtDate(data?.plan_expires_at, "Sans limite")}</dd>
          </dl>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>Changer de formule</h3>
          <p className="helper" style={{ marginBottom: 10 }}>Votre demande est transmise à l&apos;équipe DIOMETRO, qui vous recontacte pour le règlement (virement, Wave, Orange Money…). La nouvelle formule est activée dès réception.</p>
          <PlanPicker action={requestPlan} offers={offers} current={plan} />
        </div>
      </div>
    </>
  );
}
