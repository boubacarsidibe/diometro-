import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";
import { EmailCodeForm } from "./EmailCodeForm";
import { MfaForm } from "./MfaForm";

// Ordinateur partagé : la personne qui arrive ici avec la session de quelqu'un d'autre peut changer de compte.
function SwitchAccount({ email }: { email: string }) {
  return (
    <form action={logout} className="otp-switch">
      <button>Ce n&apos;est pas vous ({email}) ? Changer de compte</button>
    </form>
  );
}

// Second facteur : code par e-mail (par défaut) ou application d'authentification (au choix de l'utilisateur).
export default async function MfaPage({ searchParams }: { searchParams: Promise<{ via?: string }> }) {
  const { via } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("user_id, mfa_method").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const { data: ok } = await supabase.rpc("mfa_ok");
  if (ok === true) redirect("/dashboard");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = Boolean(factors?.totp?.some((f) => f.status === "verified"));
  const method = via === "totp" || via === "email" ? via : profile.mfa_method === "totp" && hasTotp ? "totp" : "email";

  if (method === "totp") {
    return (
      <>
        <MfaForm />
        <div className="otp-alt"><Link href="/mfa?via=email">Recevoir plutôt un code par e-mail</Link></div>
        <SwitchAccount email={user.email ?? ""} />
      </>
    );
  }
  return (
    <>
      <EmailCodeForm email={user.email ?? ""} hasTotp={hasTotp} />
      <SwitchAccount email={user.email ?? ""} />
    </>
  );
}
