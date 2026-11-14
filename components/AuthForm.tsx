"use client";
import { useActionState, useState, type ReactNode } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

type Input = { name: string; label: string; type?: string; autoComplete?: string; hint?: string; required?: boolean };

// idPrefix : rend les identifiants uniques quand deux formulaires partagent la page (connexion et inscription).
export function AuthForm({
  action, inputs, submit, initialError, checks = [], hidden = {}, idPrefix = "",
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>; inputs: Input[]; submit: string; initialError?: string;
  checks?: { name: string; label: ReactNode }[]; hidden?: Record<string, string>; idPrefix?: string;
}) {
  const [state, formAction] = useActionState(action, initialError ? { error: initialError } : {});
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      {inputs.map((i) => (
        <Field key={i.name} label={i.label} name={`${idPrefix}${i.name}`} error={state.fieldErrors?.[i.name]}>
          {i.type === "password"
            ? <PasswordInput id={`${idPrefix}${i.name}`} name={i.name} autoComplete={i.autoComplete} required={i.required !== false} meter={i.autoComplete === "new-password" && i.name === "password"} />
            : <input id={`${idPrefix}${i.name}`} name={i.name} type={i.type ?? "text"} className="input" autoComplete={i.autoComplete} defaultValue={state.values?.[i.name] ?? ""} required={i.required !== false} />}
          {i.hint && <span className="helper">{i.hint}</span>}
        </Field>
      ))}
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {checks.map((c) => (
        <div key={c.name}>
          <label className="consent"><input type="checkbox" name={c.name} required /> <span>{c.label}</span></label>
          {state.fieldErrors?.[c.name] && <span className="field-error" role="alert">{state.fieldErrors[c.name]}</span>}
        </div>
      ))}
      <div className="form-actions">
        <SubmitButton>{submit}</SubmitButton>
      </div>
    </form>
  );
}

// Mêmes règles que le serveur (passwordSchema) : 12 caractères, une majuscule, une minuscule, un chiffre.
const RULES: [string, (p: string) => boolean][] = [
  ["12 caractères", (p) => p.length >= 12], ["une majuscule", (p) => /[A-Z]/.test(p)],
  ["une minuscule", (p) => /[a-z]/.test(p)], ["un chiffre", (p) => /\d/.test(p)],
];

// Champ mot de passe avec bouton afficher / masquer et, pour un nouveau mot de passe, jauge des règles à respecter
// (repris de la version locale : setupPasswordToggles et attachPasswordStrengthIndicator).
function PasswordInput({ id, name, autoComplete, required, meter }: { id: string; name: string; autoComplete?: string; required: boolean; meter: boolean }) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const passed = RULES.map(([, test]) => test(value));
  return (
    <>
      <div className="pw-wrap">
        <input id={id} name={name} type={show ? "text" : "password"} className="input" autoComplete={autoComplete} required={required}
          value={value} onChange={(e) => setValue(e.target.value)} aria-describedby={meter ? `${id}-rules` : undefined} />
        <button type="button" className="pw-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={show}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {show ? <><path d="M3 3l18 18" /><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
              : <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>}
          </svg>
        </button>
      </div>
      {meter && (
        <div className="pw-meter" id={`${id}-rules`}>
          <div className="pw-bars" aria-hidden="true">{passed.map((ok, k) => <i key={k} className={passed.filter(Boolean).length > k ? "on" : ""} />)}</div>
          <div className="pw-rules">{RULES.map(([label], k) => <span key={label} className={passed[k] ? "ok" : ""}>{label}</span>)}</div>
        </div>
      )}
    </>
  );
}
