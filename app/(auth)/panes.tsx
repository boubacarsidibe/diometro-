import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { TRIAL_DAYS, offerById } from "@/lib/plans";
import { login, logout, register } from "./actions";

const LOGIN_ERRORS: Record<string, string> = {
  inactive: "Ce compte est désactivé. Contactez votre administrateur.",
  link: "Lien invalide ou expiré.",
};

// Contenu des deux formulaires, partagé par /login et /register (la carte affiche les deux).
export function LoginPane({ error, current }: { error?: string; current?: string | null }) {
  return (
    <>
      <h1>Connexion</h1>
      <p className="lead">Votre plateforme de gestion métrologique.</p>
      {current && (
        <div className="notice ok session-on">
          <span>Déjà connecté avec <strong>{current}</strong>.</span>
          <span className="session-actions">
            <Link className="btn primary small" href="/dashboard">Continuer</Link>
            <form action={logout}><button className="btn soft small">Se déconnecter</button></form>
          </span>
          <span className="helper">Pour utiliser un autre compte, connectez-vous ci-dessous.</span>
        </div>
      )}
      <AuthForm
        action={login}
        submit="Se connecter"
        idPrefix="login-"
        initialError={error ? LOGIN_ERRORS[error] : undefined}
        inputs={[
          { name: "email", label: "Email", type: "email", autoComplete: "username" },
          { name: "password", label: "Mot de passe", type: "password", autoComplete: "current-password" },
        ]}
        checks={[{ name: "remember", optional: true, label: <>Rester connecté sur cet appareil <span className="helper">(à ne pas cocher sur un ordinateur partagé)</span></> }]}
      />
      <div className="auth-links">
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
        <a href="/register" data-au-go="signup">Inscrire mon entreprise</a>
      </div>
    </>
  );
}

export function SignupPane({ formule }: { formule?: string }) {
  const offer = formule ? offerById(formule) : undefined;
  return (
    <>
      <h1>Inscrire mon entreprise</h1>
      <p className="lead">Créez le compte administrateur de votre entreprise : essai gratuit de {TRIAL_DAYS} jours.</p>
      {offer && <div className="notice ok">Formule envisagée : <strong>{offer.nom}</strong>. Vous la confirmerez à la fin de l&apos;essai.</div>}
      <AuthForm
        action={register}
        submit="Créer mon compte"
        idPrefix="signup-"
        hidden={{ formule: offer?.id ?? "" }}
        inputs={[
          { name: "email", label: "Email professionnel", type: "email", autoComplete: "email" },
          { name: "password", label: "Mot de passe", type: "password", autoComplete: "new-password", hint: "12 caractères minimum, avec majuscule, minuscule et chiffre." },
        ]}
        checks={[{
          name: "accept",
          label: <>J&apos;accepte les <Link href="/cgu" target="_blank">conditions générales d&apos;utilisation</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</>,
        }]}
      />
      <div className="auth-links"><a href="/login" data-au-go="login">J&apos;ai déjà un compte</a></div>
    </>
  );
}
