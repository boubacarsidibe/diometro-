"use client";
import { useActionState } from "react";
import { Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

export function TestEmailButton({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction] = useActionState(async () => action(), {} as FormState);
  return (
    <form action={formAction}>
      <Notice error={state.error} ok={state.ok} />
      <SubmitButton className="btn soft">Envoyer un email de test</SubmitButton>
    </form>
  );
}
