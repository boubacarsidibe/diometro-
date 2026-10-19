"use client";
import { useActionState } from "react";
import { Field, Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";
import { ROLES } from "@/lib/schemas";

const LABEL: Record<string, string> = { admin: "Administrateur", responsable: "Coordinateur", consultation: "Consultation" };

export function InviteForm({ action, canAssignAdmin }: { action: (s: FormState, f: FormData) => Promise<FormState>; canAssignAdmin: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate>
      <Notice error={state.error} ok={state.ok} />
      <div className="grid cols-3">
        <Field label="Email" name="email" error={e.email}><input id="email" name="email" type="email" className="input" required /></Field>
        <Field label="Nom affiché" name="displayName" error={e.displayName}><input id="displayName" name="displayName" className="input" required /></Field>
        <Field label="Rôle" name="role"><select id="role" name="role" className="input" defaultValue="consultation">{ROLES.filter((r) => canAssignAdmin || r !== "admin").map((r) => <option key={r} value={r}>{LABEL[r]}</option>)}</select></Field>
      </div>
      <div className="form-actions"><SubmitButton>Envoyer l&apos;invitation</SubmitButton></div>
    </form>
  );
}
