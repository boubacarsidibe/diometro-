"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

export function StartInventoryForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <Field label="Note (facultatif)" name="note" error={state.fieldErrors?.note}><input id="note" name="note" className="input" maxLength={500} placeholder="Ex. inventaire annuel 2026" defaultValue={state.values?.note ?? ""} /></Field>
      <div className="form-actions"><SubmitButton>Démarrer un inventaire</SubmitButton></div>
    </form>
  );
}
