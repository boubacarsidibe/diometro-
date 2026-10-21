"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

export function BrandingForm({
  action, name, accent, alertsEnabled, logo,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; name: string; accent: string; alertsEnabled: boolean; logo: string | null }) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-2">
        <Field label="Nom de l'entreprise" name="name" error={e.name}><input id="name" name="name" className="input" defaultValue={state.values?.name ?? name} maxLength={120} required /></Field>
        <Field label="Couleur principale" name="accent" error={e.accent}><input id="accent" name="accent" type="color" className="input" style={{ height: 44, padding: 4 }} defaultValue={state.values?.accent ?? accent} /></Field>
        <Field label="Logo (PNG, JPEG ou WebP, 150 Ko max)" name="logo" error={e.logo} full>
          {logo && (<div style={{ marginBottom: 8 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={logo} alt="Logo actuel" style={{ maxHeight: 48, background: "#0a0f1e", padding: 6, borderRadius: 8 }} /></div>)}
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
          {logo && <label style={{ marginTop: 6 }}><input type="checkbox" name="remove_logo" /> Supprimer le logo actuel</label>}
        </Field>
        <Field label="Alertes d'échéance par email" name="alerts_enabled" full>
          <label><input id="alerts_enabled" name="alerts_enabled" type="checkbox" defaultChecked={state.values ? state.values.alerts_enabled === "on" : alertsEnabled} /> Envoyer un email aux administrateurs et coordinateurs (J-30, J-15, J-7, J-1, jour J, retards le lundi)</label>
        </Field>
      </div>
      <div className="form-actions"><SubmitButton>Enregistrer</SubmitButton></div>
    </form>
  );
}
