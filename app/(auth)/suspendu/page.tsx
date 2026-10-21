import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

export default async function SuspenduPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("my_tenant_state");
  const state = Array.isArray(data) ? data[0] : data;
  if (!state) redirect("/onboarding");
  const expired = state.status === "active" && state.plan_expires_at && state.plan_expires_at < new Date().toISOString().slice(0, 10);
  if (state.status === "active" && !expired) redirect("/dashboard");
  return (
    <>
      <p className="lead">{state.name}</p>
      <div className="notice err" role="alert">
        {expired
          ? `Votre abonnement (${state.plan}) a expiré le ${state.plan_expires_at}. Contactez votre fournisseur DIOMETRO pour le renouveler : vos données sont conservées.`
          : "L'accès de votre entreprise est suspendu. Contactez votre fournisseur DIOMETRO."}
      </div>
      <form action={logout}><div className="form-actions"><button className="btn primary">Se déconnecter</button></div></form>
    </>
  );
}
