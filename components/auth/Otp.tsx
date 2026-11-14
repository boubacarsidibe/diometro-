"use client";
// Vérification du code (double authentification) : panneau « verre » aux coins biseautés, icône de clé,
// six cases lumineuses, compte à rebours de renvoi et bouton avec indicateur de chargement.
// Inspiré d'un motif « Glassy OTP », adapté à la palette DIOMETRO (bordeaux et orange).
import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="15" r="4" /><path d="M10.85 12.15 19 4M17 6l2 2M14.5 8.5l2 2" />
  </svg>
);

/** Panneau du code : titre, sous-titre et contenu (cases, renvoi, bouton). */
export function OtpShell({ title, em, subtitle, children }: { title: string; em: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="otp">
      <div className="otp-rim">
        <div className="otp-glass">
          <div className="otp-icon"><KeyIcon /></div>
          <h1 className="otp-title">{title} <em>{em}</em></h1>
          <p className="otp-sub">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Six cases d'un chiffre. Saisie, effacement et flèches passent d'une case à l'autre ; un code collé ou
 * proposé par le téléphone (one-time-code) remplit toutes les cases. `onComplete` est appelé au 6e chiffre.
 * `name` : ajoute un champ caché pour les formulaires envoyés au serveur.
 */
export function OtpInput({ value, onChange, onComplete, name, invalid = false, disabled = false, length = 6 }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; name?: string; invalid?: boolean; disabled?: boolean; length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const set = (next: string, focusAt?: number) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (focusAt !== undefined) refs.current[Math.min(focusAt, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  };

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    if (typed.length > 1) { set(value.slice(0, i) + typed, i + typed.length); return; } // remplissage automatique du téléphone
    const arr = digits.slice(); arr[i] = typed;
    set(arr.join("").slice(0, Math.max(i + 1, value.length)), i + 1);
  };
  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) { const arr = digits.slice(); arr[i] = ""; set(arr.join(""), i); }
      else if (i > 0) { const arr = digits.slice(); arr[i - 1] = ""; set(arr.join(""), i - 1); }
    } else if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); refs.current[i - 1]?.focus(); }
    else if (e.key === "ArrowRight" && i < length - 1) { e.preventDefault(); refs.current[i + 1]?.focus(); }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    set(text, text.length);
  };

  return (
    <div className={`otp-boxes${invalid ? " otp-invalid" : ""}`} role="group" aria-label={`Code à ${length} chiffres`}>
      {name && <input type="hidden" name={name} value={value} />}
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`otp-box${d ? " filled" : ""}`}
          value={d}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          aria-label={`Chiffre ${i + 1} sur ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          onFocus={(e) => {
            // Les cases se remplissent dans l'ordre : un clic plus loin ramène à la première case vide.
            if (i > value.length) refs.current[value.length]?.focus(); else e.target.select();
          }}
        />
      ))}
    </div>
  );
}

/** « Vous n'avez rien reçu ? Renvoyer dans 00:35 », puis bouton « Renvoyer le code ». */
export function OtpResend({ secondsLeft, onResend, sending }: { secondsLeft: number; onResend: () => void; sending: boolean }) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <p className="otp-resend" aria-live="polite">
      Vous n&apos;avez rien reçu ?{" "}
      {sending ? <strong>Envoi…</strong>
        : secondsLeft > 0 ? <strong>Renvoyer dans {mm}:{ss}</strong>
        : <button type="button" className="otp-link" onClick={onResend}>Renvoyer le code</button>}
    </p>
  );
}

/** Bouton principal : indicateur de chargement et « Vérification du code… » pendant l'envoi. */
export function OtpSubmit({ pending, disabled }: { pending: boolean; disabled?: boolean }) {
  return (
    <button type="submit" className="otp-submit" disabled={pending || disabled} aria-busy={pending}>
      {pending ? <><span className="otp-spin" aria-hidden="true" /> Vérification du code…</> : "Vérifier le code"}
    </button>
  );
}
