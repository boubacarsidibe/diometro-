"use client";
import { useActionState, useRef } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";
import { INTERVENTION_TYPES, RESULTATS } from "@/lib/schemas";

export function InterventionForm({ action }: { action: (s: FormState, f: FormData) => Promise<FormState> }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (s: FormState, f: FormData) => {
    const r = await action(s, f);
    if (r.ok) ref.current?.reset();
    return r;
  }, {});
  const e = state.fieldErrors ?? {};
  return (
    <form ref={ref} action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-3">
        <Field label="Date *" name="date" error={e.date}><input id="date" name="date" type="date" className="input" defaultValue={state.values?.date ?? ""} required /></Field>
        <Field label="Type" name="type"><select id="type" name="type" className="input" defaultValue={state.values?.type}>{INTERVENTION_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Résultat" name="resultat"><select id="resultat" name="resultat" className="input" defaultValue={state.values?.resultat}>{RESULTATS.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Prestataire" name="prestataire" error={e.prestataire}><input id="prestataire" name="prestataire" className="input" maxLength={200} defaultValue={state.values?.prestataire ?? ""} /></Field>
        <Field label="Réf. certificat" name="ref_certificat" error={e.ref_certificat}><input id="ref_certificat" name="ref_certificat" className="input" maxLength={100} defaultValue={state.values?.ref_certificat ?? ""} /></Field>
        <Field label="Observation" name="observation" error={e.observation}><input id="observation" name="observation" className="input" maxLength={2000} defaultValue={state.values?.observation ?? ""} /></Field>
      </div>
      <div className="form-actions"><SubmitButton>Enregistrer l&apos;intervention</SubmitButton></div>
    </form>
  );
}
