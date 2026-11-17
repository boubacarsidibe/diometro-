import { ConsoleBoard } from "@/components/console/ConsoleBoard";
import { requirePlatformAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import { type ConsoleTenant } from "@/lib/console";
import { consoleSections } from "@/components/console/ConsoleSections";
import { setTenant } from "./actions";

export default async function PlatformPage() {
  const s = await requirePlatformAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_overview");
  const tenants: ConsoleTenant[] = ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id), name: String(t.name), status: String(t.status), plan: String(t.plan),
    plan_expires_at: (t.plan_expires_at as string | null) ?? null, created_at: String(t.created_at),
    users: Number(t.users), instruments: Number(t.instruments),
    max_instruments: t.max_instruments == null ? null : Number(t.max_instruments), sector: String(t.sector ?? ""),
    // Absents tant que la migration 0014 n'est pas appliquée : la console affiche alors « — ».
    admin_email: (t.admin_email as string | null | undefined) ?? null,
    last_sign_in_at: (t.last_sign_in_at as string | null | undefined) ?? null,
  }));
  const today = todayIn(s.timeZone);
  const { chart, bottom } = consoleSections(tenants, today);
  const firstName = s.displayName.split(" ")[0];

  return (
    <>
      <header className="cs-top">
        <div className="cs-grow"><h1>Bonjour {firstName}</h1><div className="cs-muted">Vos clients, leurs abonnements et vos revenus estimés.</div></div>
        <div className="cs-me"><div className="cs-av" aria-hidden="true">{s.displayName.slice(0, 2).toUpperCase()}</div><div><b>{s.displayName}</b><small>Admin plateforme</small></div></div>
      </header>
      <ConsoleBoard tenants={tenants} today={today} action={setTenant} middle={chart} bottom={bottom} />
    </>
  );
}
