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
  if (state.status === "active") redirect("/dashboard"); // essai ou abonnement expiré : lecture seule, pas de blocage
  return (
    <>
      <p className="lead">{state.name}</p>
      <div className="notice err" role="alert">
        L&apos;accès de votre entreprise est suspendu. Contactez votre fournisseur DIOMETRO : vos données sont conservées.
      </div>
      <form action={logout}><div className="form-actions"><button className="btn primary">Se déconnecter</button></div></form>
    </>
  );
}
