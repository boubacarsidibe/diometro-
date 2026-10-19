import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { login } from "../actions";

const ERRORS: Record<string, string> = {
  inactive: "Ce compte est désactivé. Contactez votre administrateur.",
  link: "Lien invalide ou expiré.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <p className="lead">Votre plateforme de gestion métrologique</p>
      <AuthForm
        action={login}
        submit="Se connecter"
        initialError={error ? ERRORS[error] : undefined}
        inputs={[
          { name: "email", label: "Email", type: "email", autoComplete: "username" },
          { name: "password", label: "Mot de passe", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="auth-links">
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
        <Link href="/register">Inscrire mon entreprise</Link>
      </div>
    </>
  );
}
