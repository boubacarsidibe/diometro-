"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";
import { STATUTS } from "@/lib/schemas";
import type { Instrument } from "@/lib/types";

export function InstrumentForm({
  action, instrument, submit,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; instrument?: Instrument; submit: string }) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = (k: keyof Instrument) => (instrument?.[k] ?? "") as string | number;
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-2">
        <Field label="Référence *" name="ref" error={e.ref}><input id="ref" name="ref" className="input" defaultValue={v("ref")} maxLength={60} required /></Field>
        <Field label="Désignation *" name="designation" error={e.designation}><input id="designation" name="designation" className="input" defaultValue={v("designation")} maxLength={200} required /></Field>
        <Field label="Type de mesure" name="type_mesure" error={e.type_mesure}><input id="type_mesure" name="type_mesure" className="input" defaultValue={v("type_mesure")} maxLength={100} /></Field>
        <Field label="Statut" name="statut" error={e.statut}>
          <select id="statut" name="statut" className="input" defaultValue={instrument?.statut ?? "En service"}>{STATUTS.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Bâtiment" name="batiment" error={e.batiment}><input id="batiment" name="batiment" className="input" defaultValue={v("batiment")} maxLength={100} /></Field>
        <Field label="Zone" name="zone" error={e.zone}><input id="zone" name="zone" className="input" defaultValue={v("zone")} maxLength={100} /></Field>
        <Field label="Dernier étalonnage" name="date_etalonnage" error={e.date_etalonnage}><input id="date_etalonnage" name="date_etalonnage" type="date" className="input" defaultValue={v("date_etalonnage")} /></Field>
        <Field label="Prochaine échéance" name="date_prochaine" error={e.date_prochaine}><input id="date_prochaine" name="date_prochaine" type="date" className="input" defaultValue={v("date_prochaine")} /></Field>
        <Field label="Fréquence (mois)" name="frequence_mois" error={e.frequence_mois}><input id="frequence_mois" name="frequence_mois" type="number" min={1} max={120} className="input" defaultValue={v("frequence_mois")} /></Field>
        <Field label="Commentaires" name="commentaires" error={e.commentaires} full><textarea id="commentaires" name="commentaires" className="input" rows={3} maxLength={2000} defaultValue={v("commentaires")} /></Field>
      </div>
      <div className="form-actions"><SubmitButton>{submit}</SubmitButton></div>
    </form>
  );
}
