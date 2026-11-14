"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { OtpInput, OtpResend, OtpShell, OtpSubmit } from "@/components/auth/Otp";
import { sendEmailCode, verifyEmailCode, type CodeState } from "./actions";

const RESEND_DELAY_MS = 60_000; // identique au serveur (RESEND_DELAY_S)

function Submit({ complete }: { complete: boolean }) {
  const { pending } = useFormStatus();
  return <OtpSubmit pending={pending} disabled={!complete} />;
}

// Le code part automatiquement à l'arrivée sur la page (une seule fois), puis l'utilisateur le saisit.
// Au 6e chiffre, le formulaire est envoyé tout seul.
export function EmailCodeForm({ email, hasTotp }: { email: string; hasTotp: boolean }) {
  const [sent, setSent] = useState<CodeState>({});
  const [sending, startSend] = useTransition();
  const [state, formAction, pending] = useActionState(verifyEmailCode, {});
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);
  const form = useRef<HTMLFormElement>(null);

  const send = (force: boolean) => startSend(async () => setSent(await sendEmailCode(force)));
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    send(false);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Code refusé : on vide les cases pour une nouvelle saisie.
  useEffect(() => { if (state.error) setCode(""); }, [state]);

  const left = sent.expiresAt ? Math.max(0, Math.round((sent.expiresAt - now) / 1000)) : null;
  const resendIn = sent.sentAt ? Math.max(0, Math.ceil((sent.sentAt + RESEND_DELAY_MS - now) / 1000)) : 0;
  const error = state.error ?? sent.error;

  return (
    <OtpShell title="Vérifier le" em="code" subtitle={<>Saisissez le code à 6 chiffres envoyé à <strong>{email}</strong>.</>}>
      <form ref={form} action={formAction} noValidate className="otp-form">
        {error && <div className="otp-alert" role="alert">{error}</div>}
        <OtpInput name="code" value={code} onChange={setCode} invalid={Boolean(state.error)} disabled={pending}
          onComplete={() => { if (!pending) form.current?.requestSubmit(); }} />
        {left !== null && <p className="otp-hint">{left > 0 ? `Valable encore ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, "0")} s · 5 essais au maximum` : "Ce code a expiré : demandez-en un nouveau."}</p>}
        <OtpResend secondsLeft={resendIn} sending={sending} onResend={() => send(true)} />
        <Submit complete={code.length === 6} />
      </form>
      <div className="otp-alt">
        <Link href="/mfa?via=totp">{hasTotp ? "Utiliser l'application d'authentification" : "Configurer une application d'authentification"}</Link>
      </div>
    </OtpShell>
  );
}
