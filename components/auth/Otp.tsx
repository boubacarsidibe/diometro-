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
 * `verifying` : les cases se rassemblent au centre et les chiffres tournent en cercle autour d'un carré
 * lumineux pendant la vérification. `name` : ajoute un champ caché pour les formulaires envoyés au serveur.
 */
export function OtpInput({ value, onChange, onComplete, name, invalid = false, disabled = false, verifying = false, length = 6 }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; name?: string; invalid?: boolean; disabled?: boolean; verifying?: boolean; length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Valeur la plus récente : la case suivante reçoit le focus avant que React ait réaffiché le composant.
  const latest = useRef(value);
  latest.current = value;
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => { refs.current[0]?.focus(); }, []);
  // Code refusé ou vidé : retour à la première case.
  useEffect(() => { if (!value && !verifying) refs.current[0]?.focus(); }, [value, verifying]);

  const set = (next: string, focusAt?: number) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    latest.current = clean;
    onChange(clean);
    if (clean.length === length) { refs.current[length - 1]?.blur(); onComplete?.(clean); return; }
    if (focusAt !== undefined) refs.current[Math.min(focusAt, length - 1)]?.focus();
  };

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    const cur = digits[i];
    // Plusieurs chiffres d'un coup : code proposé par le téléphone ou collé.
    if (typed.length > (cur ? 2 : 1)) { set(latest.current.slice(0, i) + typed, i + typed.length); return; }
    // Une case déjà remplie reçoit l'ancien et le nouveau chiffre : on garde le nouveau.
    const ch = cur && typed.length === 2 ? (typed[0] === cur ? typed[1] : typed[0]) : typed.slice(-1);
    const arr = digits.slice(); arr[i] = ch;
    set(arr.join(""), i + 1);
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
    <div className={`otp-stage${verifying ? " is-verifying" : ""}`}>
      <div className={`otp-boxes${invalid && !verifying ? " otp-invalid" : ""}`} role="group" aria-label={`Code à ${length} chiffres`} aria-busy={verifying || undefined}>
        {name && <input type="hidden" name={name} value={value} />}
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            className={`otp-box${d ? " filled" : ""}`}
            style={{ ["--k" as string]: i - (length - 1) / 2 }}
            value={d}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? length : 2}
            disabled={disabled || verifying}
            aria-label={`Chiffre ${i + 1} sur ${length}`}
            aria-invalid={invalid || undefined}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onFocus={(e) => {
              // Les cases se remplissent dans l'ordre : un clic plus loin ramène à la première case vide.
              const first = latest.current.length;
              if (i > first) refs.current[first]?.focus(); else e.target.select();
            }}
          />
        ))}
      </div>
      {verifying && (
        // Animation de vérification : carré lumineux au centre, chiffres en orbite.
        <div className="otp-orbit" aria-hidden="true">
          <div className="otp-core" />
          <div className="otp-ring">
            {digits.map((d, i) => (
              <span key={i} style={{ ["--i" as string]: i, ["--n" as string]: length }}><b>{d}</b></span>
            ))}
          </div>
        </div>
      )}
      {verifying && <span className="sr-only" role="status">Vérification du code en cours</span>}
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
