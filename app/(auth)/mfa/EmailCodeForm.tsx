"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { sendEmailCode, verifyEmailCode, type CodeState } from "./actions";

// Le code part automatiquement à l'arrivée sur la page (une seule fois), puis l'utilisateur le saisit.
export function EmailCodeForm({ email, hasTotp }: { email: string; hasTotp: boolean }) {
  const [sent, setSent] = useState<CodeState>({});
  const [sending, startSend] = useTransition();
  const [state, formAction] = useActionState(verifyEmailCode, {});
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);

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

  const left = sent.expiresAt ? Math.max(0, Math.round((sent.expiresAt - now) / 1000)) : null;
  const canResend = !sending && (!sent.sentAt || now - sent.sentAt > 60_000);

  return (
    <form action={formAction} noValidate>
      <p className="lead">Un code à 6 chiffres est envoyé à <strong>{email}</strong>. Il est valable 10 minutes.</p>
      <Notice error={state.error ?? sent.error} />
      {sending && <div className="notice ok" role="status"><span className="spinner" aria-hidden="true" /> Envoi du code…</div>}
      <div className="field">
        <label htmlFor="code">Code reçu par e-mail</label>
        <input id="code" name="code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required autoFocus
          style={{ fontSize: 22, letterSpacing: "0.4em", textAlign: "center" }} />
        {left !== null && <span className="helper" aria-live="polite">{left > 0 ? `Code valable encore ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, "0")} s. 5 essais au maximum.` : "Ce code a expiré : demandez-en un nouveau."}</span>}
      </div>
      <div className="form-actions"><SubmitButton>Valider</SubmitButton></div>
      <div className="auth-links">
        <button type="button" className="btn small soft" disabled={!canResend} onClick={() => send(true)}>Renvoyer un code</button>
        <Link href="/mfa?via=totp">{hasTotp ? "Utiliser l'application d'authentification" : "Configurer une application d'authentification"}</Link>
      </div>
    </form>
  );
}
