import { AuthForm } from "@/components/AuthForm";
import { Topbar } from "@/components/Topbar";
import { requireSession } from "@/lib/session";
import { changeOwnPassword } from "./actions";

// Mon compte : accessible à tous les rôles (la page Paramètres est réservée aux administrateurs).
export default async function ComptePage() {
  const s = await requireSession();
  return (
    <>
      <Topbar title="Mon compte" subtitle={`${s.displayName} · ${s.email}`} />
      <div className="content stack">
        <div className="card" style={{ maxWidth: 560 }}>
          <h2>Changer mon mot de passe</h2>
          <p className="helper" style={{ marginBottom: 14 }}>Votre mot de passe actuel est demandé pour confirmer que c&apos;est bien vous.</p>
          <AuthForm
            action={changeOwnPassword}
            submit="Changer mon mot de passe"
            idPrefix="compte-"
            inputs={[
              { name: "current_password", label: "Mot de passe actuel", type: "password", autoComplete: "current-password" },
              { name: "password", label: "Nouveau mot de passe", type: "password", autoComplete: "new-password", hint: "12 caractères minimum, avec majuscule, minuscule et chiffre." },
              { name: "confirm", label: "Confirmer le nouveau mot de passe", type: "password", autoComplete: "new-password" },
            ]}
          />
        </div>
      </div>
    </>
  );
}
