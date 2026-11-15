"use client";
import { useActionState, useState } from "react";
import { Field, Notice } from "@/components/Field";
import { BuildingsEditor } from "@/components/BuildingsEditor";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";
import { TIME_ZONES } from "@/lib/timezones";
import { fmtDateTime } from "@/lib/dates";

export function BrandingForm({
  action, name, alertsEnabled, logo, accreditation, currency, sector, phone, buildings, buildingUsage, timeZone,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; name: string; alertsEnabled: boolean; logo: string | null; accreditation: string; currency: string; sector: string; phone: string; buildings: string[]; buildingUsage: Record<string, number>; timeZone: string }) {
  const [state, formAction] = useActionState(action, {});
  const [tz, setTz] = useState(state.values?.time_zone || timeZone);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-2">
        <Field label="Nom de l'entreprise" name="name" error={e.name}><input id="name" name="name" className="input" defaultValue={state.values?.name ?? name} maxLength={120} required /></Field>
        <Field label="Secteur d'activité" name="sector" error={e.sector}><input id="sector" name="sector" className="input" defaultValue={state.values?.sector ?? sector} maxLength={100} /></Field>
        <Field label="Téléphone" name="phone" error={e.phone}><input id="phone" name="phone" type="tel" className="input" defaultValue={state.values?.phone ?? phone} maxLength={40} /></Field>
        <Field label="Organisme d'accréditation" name="accreditation_label" error={e.accreditation_label}><input id="accreditation_label" name="accreditation_label" className="input" defaultValue={state.values?.accreditation_label ?? accreditation} placeholder="COFRAC, SENAC…" maxLength={60} required /></Field>
        <Field label="Devise des tarifs" name="currency" error={e.currency}>
          <select id="currency" name="currency" className="input" defaultValue={state.values?.currency ?? currency}><option value="XOF">FCFA (XOF)</option><option value="EUR">Euro (EUR)</option><option value="USD">Dollar (USD)</option></select>
        </Field>
        <Field label="Fuseau horaire" name="time_zone" error={e.time_zone}>
          <select id="time_zone" name="time_zone" className="input" value={tz} onChange={(ev) => setTz(ev.target.value)}>
            {!TIME_ZONES.some((z) => z.id === tz) && <option value={tz}>{tz}</option>}
            {TIME_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
          <span className="helper" suppressHydrationWarning>Heure actuelle : {fmtDateTime(new Date().toISOString(), "—", tz)}. Utilisé pour le journal d&apos;audit, les exports et les alertes.</span>
        </Field>
        <Field label="Bâtiments" name="buildings" error={e.buildings} full>
          <BuildingsEditor id="buildings" name="buildings" initial={state.values?.buildings !== undefined ? state.values.buildings.split("\n").filter(Boolean) : buildings} usage={buildingUsage} />
        </Field>
        <Field label="Logo (PNG, JPEG ou WebP, 150 Ko max)" name="logo" error={e.logo} full>
          {logo && (<div style={{ marginBottom: 8 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={logo} alt="Logo actuel" style={{ maxHeight: 48, background: "var(--sb-bg)", padding: 6, borderRadius: 8 }} /></div>)}
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
