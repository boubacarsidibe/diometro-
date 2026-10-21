"use server";

import { revalidatePath } from "next/cache";
import { parseForm, type FormState } from "@/lib/form";
import { platformTenantSchema } from "@/lib/schemas";
import { requirePlatformAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function setTenant(_: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  const parsed = parseForm(platformTenantSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_tenant", {
    p_tenant: parsed.data.tenant_id, p_status: parsed.data.status, p_plan: parsed.data.plan, p_expires: parsed.data.expires,
  });
  if (error) return { error: "Mise à jour refusée." };
  revalidatePath("/admin");
  return { ok: "Enregistré." };
}
