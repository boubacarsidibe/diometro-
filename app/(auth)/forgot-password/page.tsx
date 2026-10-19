import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { forgotPassword } from "../actions";

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="lead">Recevez un lien de réinitialisation par email.</p>
      <AuthForm action={forgotPassword} submit="Envoyer le lien" inputs={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
      <div className="auth-links"><Link href="/login">Retour à la connexion</Link></div>
    </>
  );
}
