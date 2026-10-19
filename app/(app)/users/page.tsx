import { InviteForm } from "@/components/InviteForm";
import { MemberRow } from "@/components/MemberRow";
import { Topbar } from "@/components/Topbar";
import { requireManager } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { inviteMember, updateMember } from "./actions";

export default async function UsersPage() {
  const s = await requireManager();
  const isAdmin = s.role === "admin";
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_id, display_name, role, active").order("display_name");
  return (
    <>
      <Topbar title="Utilisateurs" subtitle="Gérez les accès et les rôles de votre entreprise." />
      <div className="content stack">
        <div className="card">
          <h2>Inviter un membre</h2>
          <InviteForm action={inviteMember} canAssignAdmin={isAdmin} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nom</th><th colSpan={3}>Rôle et accès</th></tr></thead>
            <tbody>
              {(data ?? []).map((m) => <MemberRow key={m.user_id} action={updateMember} member={m} self={m.user_id === s.userId} canAssignAdmin={isAdmin} locked={!isAdmin && m.role === "admin"} />)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
