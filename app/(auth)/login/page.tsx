import { AuthSwitcher } from "@/components/auth/AuthCards";
import { TRIAL_DAYS } from "@/lib/plans";
import { cookies } from "next/headers";
import { createClient, LAST_EMAIL_COOKIE } from "@/lib/supabase/server";
import { LoginPane, SignupPane } from "../panes";

// Comme sur un site classique, le formulaire s'affiche toujours : sur un ordinateur partagé, chacun se connecte
// avec son propre compte (la nouvelle connexion remplace la précédente).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const raw = (await cookies()).get(LAST_EMAIL_COOKIE)?.value ?? "";
  const lastEmail = /^[^\s@<>"]{1,100}@[^\s@<>"]{1,150}$/.test(raw) ? raw : "";
  let current: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: ok } = await supabase.rpc("mfa_ok");
      if (ok === true) current = user.email ?? null;
    }
  } catch {
    // Supabase indisponible : formulaire seul.
  }
  return <AuthSwitcher initial="login" trialDays={TRIAL_DAYS} login={<LoginPane error={error} current={current} lastEmail={lastEmail} />} signup={<SignupPane />} />;
}
