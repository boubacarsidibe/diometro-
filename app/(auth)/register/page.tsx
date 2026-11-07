import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { TRIAL_DAYS, offerById } from "@/lib/plans";
import { register } from "../actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ formule?: string }> }) {
  const { formule } = await searchParams;
  const offer = formule ? offerById(formule) : undefined;
  return (
    <>
      <p className="lead">Créez le compte administrateur de votre entreprise — essai gratuit de {TRIAL_DAYS} jours.</p>
      {offer && <div className="notice ok">Formule envisagée : <strong>{offer.nom}</strong>. Vous la confirmerez à la fin de l&apos;essai.</div>}
      <AuthForm
        action={register}
        submit="Créer mon compte"
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
      <div className="auth-links"><Link href="/login">J&apos;ai déjà un compte</Link><Link href="/">← Accueil</Link></div>
    </>
  );
}
