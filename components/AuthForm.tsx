"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

type Input = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };

export function AuthForm({
  action, inputs, submit, initialError,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; inputs: Input[]; submit: string; initialError?: string }) {
  const [state, formAction] = useActionState(action, initialError ? { error: initialError } : {});
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      {inputs.map((i) => (
        <Field key={i.name} label={i.label} name={i.name} error={state.fieldErrors?.[i.name]}>
          <input id={i.name} name={i.name} type={i.type ?? "text"} className="input" autoComplete={i.autoComplete} defaultValue={state.values?.[i.name] ?? ""} required />
          {i.hint && <span className="helper">{i.hint}</span>}
        </Field>
      ))}
      <div className="form-actions">
        <SubmitButton>{submit}</SubmitButton>
      </div>
    </form>
  );
}
