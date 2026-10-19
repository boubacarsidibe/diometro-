"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import { ROLES } from "@/lib/schemas";

const LABEL: Record<string, string> = { admin: "Administrateur", responsable: "Coordinateur", consultation: "Consultation" };

export function MemberRow({
  action, member, self, canAssignAdmin, locked,
}: { action: (s: FormState, f: FormData) => Promise<FormState>; member: { user_id: string; display_name: string; role: string; active: boolean }; self: boolean; canAssignAdmin: boolean; locked: boolean }) {
  const [state, formAction] = useActionState(action, {});
  if (locked) {
    return (
      <tr>
        <td>{member.display_name}</td>
        <td colSpan={3}><span className="tag">{LABEL[member.role]}</span> <span className="helper">Géré par un administrateur</span></td>
      </tr>
    );
  }
  return (
    <tr>
      <td>{member.display_name}{self && <span className="helper"> (vous)</span>}</td>
      <td colSpan={3}>
        <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="user_id" value={member.user_id} />
          <select name="role" className="input" defaultValue={member.role} style={{ maxWidth: 170 }} aria-label={`Rôle de ${member.display_name}`}>
            {ROLES.filter((r) => canAssignAdmin || r !== "admin").map((r) => <option key={r} value={r}>{LABEL[r]}</option>)}
          </select>
          <select name="active" className="input" defaultValue={String(member.active)} style={{ maxWidth: 120 }} aria-label={`Accès de ${member.display_name}`}>
            <option value="true">Actif</option><option value="false">Désactivé</option>
          </select>
          <button className="btn small soft">Appliquer</button>
          {state.error && <span className="field-error" role="alert">{state.error}</span>}
          {state.ok && <span className="helper" role="status">{state.ok}</span>}
        </form>
      </td>
    </tr>
  );
}
