"use client";
import { useActionState } from "react";
import { Notice } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/form";

type Offer = { id: string; nom: string; cible: string; instruments: number | null; prix: string | null };

// Choix d'une formule : envoie une demande à l'équipe DIOMETRO (activation après règlement).
export function PlanPicker({ action, offers, current }: { action: (s: FormState, f: FormData) => Promise<FormState>; offers: Offer[]; current: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <div>
      <Notice error={state.error} ok={state.ok} />
      <div className="table-wrap"><table>
        <thead><tr><th>Formule</th><th>Pour qui</th><th>Capacité</th><th>Tarif</th><th /></tr></thead>
        <tbody>{offers.map((o) => (
          <tr key={o.id}>
            <td><strong>{o.nom}</strong>{o.id === current && <> <span className="tag green">Formule actuelle</span></>}</td>
            <td>{o.cible}</td>
            <td>{o.instruments ? `Jusqu'à ${o.instruments.toLocaleString("fr-FR")} instruments` : "Plus de 2 000 instruments"}</td>
            <td>{o.prix ?? <span className="helper">Communiqué sur demande</span>}</td>
            <td style={{ textAlign: "right" }}>
              {o.id !== current && (
                <form action={formAction}><input type="hidden" name="plan" value={o.id} /><SubmitButton className="btn small soft">{o.id === "custom" ? "Demander un devis" : "Choisir cette formule"}</SubmitButton></form>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
