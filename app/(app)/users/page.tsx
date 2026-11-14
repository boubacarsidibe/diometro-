import { InviteForm } from "@/components/InviteForm";
import { MemberRow } from "@/components/MemberRow";
import { Topbar } from "@/components/Topbar";
import { Filterable } from "@/components/Filterable";
import { requireManager } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { inviteMember, updateMember } from "./actions";

export default async function UsersPage() {
  const s = await requireManager();
  const isAdmin = s.role === "admin";
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_id, display_name, role, active, phone").order("display_name");
  return (
    <>
      <Topbar title="Utilisateurs" subtitle="Gérez les accès et les rôles de votre entreprise." />
      <div className="content stack">
        <div className="card">
          <h2>Inviter un membre</h2>
          <InviteForm action={inviteMember} canAssignAdmin={isAdmin} />
        </div>
        <div className="card">
        <h2>Membres</h2>
        <Filterable placeholder="Rechercher un membre (nom)" unit={["membre", "membres"]}
          selects={[
            { key: "role", label: "Tous les rôles", options: [{ value: "admin", label: "Administrateur" }, { value: "responsable", label: "Coordinateur" }, { value: "consultation", label: "Consultation" }] },
            { key: "acces", label: "Tous les accès", options: [{ value: "actif", label: "Actifs" }, { value: "inactif", label: "Désactivés" }] },
          ]}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th colSpan={3}>Rôle et accès</th></tr></thead>
            <tbody>
              {(data ?? []).map((m) => <MemberRow key={m.user_id} action={updateMember} member={m} self={m.user_id === s.userId} canAssignAdmin={isAdmin} locked={!isAdmin && m.role === "admin"} />)}
            </tbody>
          </table>
        </div>
        </Filterable>
        </div>
      </div>
    </>
  );
}
