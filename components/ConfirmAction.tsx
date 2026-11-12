"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

// Action sensible en deux temps : un premier clic affiche la confirmation, le second envoie le formulaire.
export function ConfirmAction({ action, label, confirmLabel, message }: { action: () => Promise<void>; label: string; confirmLabel: string; message: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn danger small" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <form action={action} className="notice err" role="alertdialog" aria-label={label} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 0 }}>
      <span style={{ flex: "1 1 260px" }}>{message}</span>
      <SubmitButton className="btn danger small">{confirmLabel}</SubmitButton>
      <button type="button" className="btn soft small" onClick={() => setOpen(false)}>Annuler</button>
    </form>
  );
}
