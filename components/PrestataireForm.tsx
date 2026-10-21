"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";
import { PRESTATAIRE_TYPES } from "@/lib/schemas";
import type { Prestataire } from "@/lib/types";

export function PrestataireForm({
  action, prestataire, submit,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; prestataire?: Prestataire; submit: string }) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = (k: keyof Prestataire, fb: string | number = "") => (state.values?.[k] ?? (prestataire?.[k] as string | number | undefined) ?? fb) as string | number;
  const checked = (k: "cofrac" | "actif", fb: boolean) => (state.values ? state.values[k] === "on" : (prestataire?.[k] ?? fb));
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-2">
        <Field label="Nom *" name="nom" error={e.nom}><input id="nom" name="nom" className="input" defaultValue={v("nom")} maxLength={200} required /></Field>
        <Field label="Type" name="type" error={e.type}>
          <select id="type" name="type" className="input" defaultValue={String(v("type", "Étalonnage externe"))}>{PRESTATAIRE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Domaines (séparés par des virgules)" name="domaines" error={e.domaines} full>
          <input id="domaines" name="domaines" className="input" defaultValue={state.values?.domaines ?? prestataire?.domaines.join(", ") ?? ""} placeholder="Température, Pression, Dimensionnel" maxLength={600} />
        </Field>
        <Field label="Accrédité COFRAC" name="cofrac"><label><input id="cofrac" name="cofrac" type="checkbox" defaultChecked={checked("cofrac", false)} /> Oui</label></Field>
        <Field label="N° d'accréditation" name="ref_cofrac" error={e.ref_cofrac}><input id="ref_cofrac" name="ref_cofrac" className="input" defaultValue={v("ref_cofrac")} maxLength={100} /></Field>
        <Field label="Contact" name="contact_nom" error={e.contact_nom}><input id="contact_nom" name="contact_nom" className="input" defaultValue={v("contact_nom")} maxLength={120} /></Field>
        <Field label="Fonction" name="contact_fonction" error={e.contact_fonction}><input id="contact_fonction" name="contact_fonction" className="input" defaultValue={v("contact_fonction")} maxLength={120} /></Field>
        <Field label="Téléphone" name="telephone" error={e.telephone}><input id="telephone" name="telephone" className="input" defaultValue={v("telephone")} maxLength={40} /></Field>
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" className="input" defaultValue={v("email")} maxLength={254} /></Field>
        <Field label="Site web" name="site_web" error={e.site_web}><input id="site_web" name="site_web" className="input" defaultValue={v("site_web")} placeholder="https://…" maxLength={300} /></Field>
        <Field label="Adresse" name="adresse" error={e.adresse}><input id="adresse" name="adresse" className="input" defaultValue={v("adresse")} maxLength={300} /></Field>
        <Field label="Délai moyen (jours)" name="delai_moyen_jours" error={e.delai_moyen_jours}><input id="delai_moyen_jours" name="delai_moyen_jours" type="number" min={0} max={365} className="input" defaultValue={v("delai_moyen_jours")} /></Field>
        <Field label="Note interne (0 à 5)" name="note_interne" error={e.note_interne}><input id="note_interne" name="note_interne" type="number" min={0} max={5} className="input" defaultValue={v("note_interne", 0)} /></Field>
        <Field label="Actif" name="actif"><label><input id="actif" name="actif" type="checkbox" defaultChecked={checked("actif", true)} /> Prestataire utilisable</label></Field>
        <Field label="Commentaires" name="commentaires" error={e.commentaires} full><textarea id="commentaires" name="commentaires" className="input" rows={3} maxLength={2000} defaultValue={v("commentaires")} /></Field>
      </div>
      <div className="form-actions"><SubmitButton>{submit}</SubmitButton></div>
    </form>
  );
}
