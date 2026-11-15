import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { CountryTimeZoneSelect } from "@/components/CountryTimeZoneSelect";
import { createClient } from "@/lib/supabase/server";
import { createCompany } from "../actions";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (profile) redirect("/dashboard");
  return (
    <>
      <p className="lead">Dernière étape : créez votre entreprise.</p>
      <AuthForm
        action={createCompany}
        extra={<CountryTimeZoneSelect detect />}
        submit="Créer l'entreprise"
        inputs={[
          { name: "company", label: "Nom de l'entreprise" },
          { name: "displayName", label: "Votre nom affiché", autoComplete: "name" },
          { name: "sector", label: "Secteur d'activité (facultatif)", required: false },
          { name: "phone", label: "Téléphone (facultatif)", type: "tel", autoComplete: "tel", required: false },
          { name: "buildings", label: "Bâtiments (facultatif)", type: "buildings", required: false, hint: "Ajoutez-les un par un (ex. : Atelier A, Laboratoire, Magasin). Modifiables plus tard dans Paramètres." },
        ]}
      />
    </>
  );
}
