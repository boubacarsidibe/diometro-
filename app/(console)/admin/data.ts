import "server-only";
import { cache } from "react";
import { requirePlatformAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";
import type { ConsoleTenant, JournalEntry } from "@/lib/console";

// Données partagées des pages de la console (une seule lecture par requête grâce à cache()).
export const loadConsole = cache(async () => {
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
  return { s, tenants, today: todayIn(s.timeZone) };
});

/** Journal de la plateforme ; vide (journalReady=false) tant que la migration 0015 n'est pas appliquée. */
export async function loadJournal(tenantId?: string): Promise<{ entries: JournalEntry[]; journalReady: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_journal", { p_tenant: tenantId ?? null, p_limit: 300 });
  if (error) return { entries: [], journalReady: false };
  return {
    journalReady: true,
    entries: ((data ?? []) as Record<string, unknown>[]).map((e) => ({
      at: String(e.at), tenant_id: String(e.tenant_id), tenant_name: String(e.tenant_name), actor: (e.actor as string | null) ?? null,
      kind: String(e.kind), detail: (e.detail ?? {}) as Record<string, unknown>,
    })),
  };
}
