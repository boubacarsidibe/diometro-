import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { register } from "../actions";

export default function RegisterPage() {
  return (
    <>
      <p className="lead">Créez le compte administrateur de votre entreprise.</p>
      <AuthForm
        action={register}
        submit="Créer mon compte"
        inputs={[
          { name: "email", label: "Email professionnel", type: "email", autoComplete: "email" },
          { name: "password", label: "Mot de passe", type: "password", autoComplete: "new-password", hint: "12 caractères minimum, avec majuscule, minuscule et chiffre." },
        ]}
      />
      <div className="auth-links"><Link href="/login">J&apos;ai déjà un compte</Link></div>
    </>
  );
}
