"use client";
import { useActionState, type ReactNode } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

type Input = { name: string; label: string; type?: string; autoComplete?: string; hint?: string; required?: boolean };

export function AuthForm({
  action, inputs, submit, initialError, checks = [], hidden = {},
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>; inputs: Input[]; submit: string; initialError?: string;
  checks?: { name: string; label: ReactNode }[]; hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, initialError ? { error: initialError } : {});
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      {inputs.map((i) => (
        <Field key={i.name} label={i.label} name={i.name} error={state.fieldErrors?.[i.name]}>
          <input id={i.name} name={i.name} type={i.type ?? "text"} className="input" autoComplete={i.autoComplete} defaultValue={state.values?.[i.name] ?? ""} required={i.required !== false} />
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
