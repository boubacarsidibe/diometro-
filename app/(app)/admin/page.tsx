import { TenantRow, type TenantRowData } from "@/components/TenantRow";
import { Topbar } from "@/components/Topbar";
import { requirePlatformAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { setTenant } from "./actions";

export default async function PlatformPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_overview");
  const tenants = ((data ?? []) as (Omit<TenantRowData, "users" | "instruments"> & { users: number | string; instruments: number | string })[]).map((t) => ({ ...t, users: Number(t.users), instruments: Number(t.instruments) }));
  const active = tenants.filter((t) => t.status === "active").length;
  return (
    <>
      <Topbar title="Plateforme" subtitle={`${tenants.length} entreprise${tenants.length > 1 ? "s" : ""} · ${active} active${active > 1 ? "s" : ""}`} />
      <div className="content stack">
        <div className="notice ok">Vous voyez uniquement des totaux par entreprise : le contenu métier de vos clients n&apos;est jamais accessible ici.</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Entreprise</th><th>Utilisateurs</th><th>Instruments</th><th>État</th><th>Statut, formule et fin d&apos;abonnement</th></tr></thead>
          <tbody>{tenants.map((t) => <TenantRow key={t.id} action={setTenant} t={t} />)}</tbody>
        </table></div>
      </div>
    </>
  );
}
