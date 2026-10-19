import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaForm } from "./MfaForm";

export default async function MfaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/dashboard");
  return <MfaForm />;
}
