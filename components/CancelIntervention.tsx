"use client";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

// Annulation d'une intervention en deux temps : le bouton ouvre un petit formulaire qui exige un motif.
export function CancelIntervention({ action, label }: { action: (s: FormState, f: FormData) => Promise<FormState>; label: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});
  if (state.ok) return <span className="helper" role="status">{state.ok}</span>;
  if (!open) return <button type="button" className="btn soft small" onClick={() => setOpen(true)} aria-label={`Annuler l'intervention du ${label}`}>Annuler</button>;
  return (
    <form action={formAction} className="cancel-form" role="group" aria-label={`Annuler l'intervention du ${label}`}>
      {state.error && <span className="field-error" role="alert">{state.error}</span>}
      <input className="input" name="motif" required minLength={3} maxLength={300} placeholder="Motif (ex. : saisie en double)" aria-label="Motif de l'annulation" autoFocus />
      <div style={{ display: "flex", gap: 6 }}>
        <SubmitButton className="btn danger small">Confirmer</SubmitButton>
        <button type="button" className="btn soft small" onClick={() => setOpen(false)}>Retour</button>
      </div>
    </form>
  );
}
