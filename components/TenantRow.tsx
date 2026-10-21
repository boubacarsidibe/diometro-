"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";

export type TenantRowData = { id: string; name: string; status: string; plan: string; plan_expires_at: string | null; created_at: string; users: number; instruments: number };

export function TenantRow({ action, t }: { action: (s: FormState, f: FormData) => Promise<FormState>; t: TenantRowData }) {
  const [state, formAction] = useActionState(action, {});
  const expired = t.plan_expires_at && t.plan_expires_at < new Date().toISOString().slice(0, 10);
  return (
    <tr>
      <td><strong>{t.name}</strong><div className="helper">créée le {new Date(t.created_at).toLocaleDateString("fr-FR")}</div></td>
      <td>{t.users}</td><td>{t.instruments}</td>
      <td>{t.status === "blocked" ? <span className="tag red">Bloquée</span> : expired ? <span className="tag orange">Expirée</span> : <span className="tag green">Active</span>}</td>
      <td>
        <form action={formAction} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input type="hidden" name="tenant_id" value={t.id} />
          <select name="status" className="input" defaultValue={t.status} style={{ maxWidth: 110 }} aria-label={`Statut de ${t.name}`}><option value="active">Active</option><option value="blocked">Bloquée</option></select>
          <select name="plan" className="input" defaultValue={t.plan} style={{ maxWidth: 110 }} aria-label={`Formule de ${t.name}`}><option value="essai">Essai</option><option value="standard">Standard</option><option value="premium">Premium</option></select>
          <input name="expires" type="date" className="input" defaultValue={t.plan_expires_at ?? ""} style={{ maxWidth: 150 }} aria-label={`Fin d'abonnement de ${t.name}`} />
          <button className="btn small soft">Appliquer</button>
          {state.error && <span className="field-error" role="alert">{state.error}</span>}
          {state.ok && <span className="helper" role="status">{state.ok}</span>}
        </form>
      </td>
    </tr>
  );
}
