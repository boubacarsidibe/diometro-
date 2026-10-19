import { AuthForm } from "@/components/AuthForm";
import { setPassword } from "../actions";

export default function SetPasswordPage() {
  return (
    <>
      <p className="lead">Choisissez votre mot de passe.</p>
      <AuthForm
        action={setPassword}
        submit="Enregistrer"
        inputs={[{ name: "password", label: "Nouveau mot de passe", type: "password", autoComplete: "new-password", hint: "12 caractères minimum, avec majuscule, minuscule et chiffre." }]}
      />
    </>
  );
}
