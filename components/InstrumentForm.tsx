"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";
import { CONFORMITES, ETALONNAGE_TYPES, STATUTS } from "@/lib/schemas";
import { CATALOG } from "@/lib/calc/catalog";
import type { Instrument } from "@/lib/types";

export function InstrumentForm({
  action, instrument, submit, buildings = [], prestataires = [],
}: { action: (s: FormState, f: FormData) => Promise<FormState>; instrument?: Instrument; submit: string; buildings?: string[]; prestataires?: { id: string; nom: string }[] }) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  const v = (k: keyof Instrument) => (state.values?.[k] ?? instrument?.[k] ?? "") as string | number;
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-2">
        <Field label="Référence *" name="ref" error={e.ref}><input id="ref" name="ref" className="input" defaultValue={v("ref")} maxLength={60} required /></Field>
        <Field label="Désignation *" name="designation" error={e.designation}><input id="designation" name="designation" className="input" defaultValue={v("designation")} maxLength={200} required /></Field>
        <Field label="Type de mesure" name="type_mesure" error={e.type_mesure}><input id="type_mesure" name="type_mesure" className="input" defaultValue={v("type_mesure")} maxLength={100} /></Field>
        <Field label="Statut" name="statut" error={e.statut}>
          <select id="statut" name="statut" className="input" defaultValue={state.values?.statut ?? instrument?.statut ?? "En service"}>{STATUTS.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Bâtiment" name="batiment" error={e.batiment}><input id="batiment" name="batiment" className="input" list="buildings-list" defaultValue={v("batiment")} maxLength={100} /><datalist id="buildings-list">{buildings.map((b) => <option key={b} value={b} />)}</datalist></Field>
        <Field label="Zone" name="zone" error={e.zone}><input id="zone" name="zone" className="input" defaultValue={v("zone")} maxLength={100} /></Field>
        <Field label="Dernier étalonnage" name="date_etalonnage" error={e.date_etalonnage}><input id="date_etalonnage" name="date_etalonnage" type="date" className="input" defaultValue={v("date_etalonnage")} /></Field>
        <Field label="Prochaine échéance" name="date_prochaine" error={e.date_prochaine}><input id="date_prochaine" name="date_prochaine" type="date" className="input" defaultValue={v("date_prochaine")} /></Field>
        <Field label="Fréquence (mois)" name="frequence_mois" error={e.frequence_mois}><input id="frequence_mois" name="frequence_mois" type="number" min={1} max={120} className="input" defaultValue={v("frequence_mois")} /></Field>
        <Field label="Type d'instrument (catalogue)" name="catalog_id" error={e.catalog_id}>
          <select id="catalog_id" name="catalog_id" className="input" defaultValue={String(v("catalog_id"))}>
            <option value="">— Non précisé —</option>{CATALOG.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </Field>
        <Field label="Conformité" name="conformite" error={e.conformite}>
          <select id="conformite" name="conformite" className="input" defaultValue={String(v("conformite") || "À vérifier")}>{CONFORMITES.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Mode d'utilisation" name="mode_utilisation" error={e.mode_utilisation}><input id="mode_utilisation" name="mode_utilisation" className="input" defaultValue={v("mode_utilisation")} maxLength={200} /></Field>
        <Field label="Graduation / résolution" name="graduation" error={e.graduation}><input id="graduation" name="graduation" className="input" defaultValue={v("graduation")} maxLength={100} /></Field>
        <Field label="Tolérance / EMT" name="tolerance" error={e.tolerance}><input id="tolerance" name="tolerance" className="input" defaultValue={v("tolerance")} maxLength={100} /></Field>
        <Field label="Propriétaire / responsable" name="proprietaire" error={e.proprietaire}><input id="proprietaire" name="proprietaire" className="input" defaultValue={v("proprietaire")} maxLength={120} /></Field>
        <Field label="Lieu de stockage" name="stockage" error={e.stockage}><input id="stockage" name="stockage" className="input" defaultValue={v("stockage")} maxLength={200} /></Field>
        <Field label="Type d'étalonnage" name="etalonnage_type" error={e.etalonnage_type}>
          <select id="etalonnage_type" name="etalonnage_type" className="input" defaultValue={String(v("etalonnage_type") || "À définir")}>{ETALONNAGE_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
        </Field>
        <Field label="Prestataire habituel" name="prestataire_id" error={e.prestataire_id}>
          <select id="prestataire_id" name="prestataire_id" className="input" defaultValue={String(v("prestataire_id"))}>
            <option value="">— Aucun —</option>{prestataires.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        </Field>
        <Field label="Origine de la fréquence" name="origine_frequence" error={e.origine_frequence}><input id="origine_frequence" name="origine_frequence" className="input" defaultValue={v("origine_frequence")} placeholder="Constructeur, norme, historique…" maxLength={200} /></Field>
        <Field label="Raccordement / traçabilité" name="raccordement" error={e.raccordement}><input id="raccordement" name="raccordement" className="input" defaultValue={v("raccordement")} maxLength={200} /></Field>
        <Field label="Lien fiche de vie" name="fiche_link" error={e.fiche_link}><input id="fiche_link" name="fiche_link" className="input" defaultValue={v("fiche_link")} placeholder="https://…" maxLength={500} /></Field>
        <Field label="Lien certificat" name="certificat_link" error={e.certificat_link}><input id="certificat_link" name="certificat_link" className="input" defaultValue={v("certificat_link")} placeholder="https://…" maxLength={500} /></Field>
        <Field label="Lien procédure" name="procedure_link" error={e.procedure_link}><input id="procedure_link" name="procedure_link" className="input" defaultValue={v("procedure_link")} placeholder="https://…" maxLength={500} /></Field>
        <Field label="Commentaires" name="commentaires" error={e.commentaires} full><textarea id="commentaires" name="commentaires" className="input" rows={3} maxLength={2000} defaultValue={v("commentaires")} /></Field>
      </div>
      <div className="form-actions"><SubmitButton>{submit}</SubmitButton></div>
    </form>
  );
}
