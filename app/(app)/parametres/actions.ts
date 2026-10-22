"use server";

import { revalidatePath } from "next/cache";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { logoToDataUri } from "@/lib/image";
import { brandingSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function saveBranding(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = parseForm(brandingSchema, formData);
  if ("state" in parsed) return parsed.state;
  const update: Record<string, unknown> = { name: parsed.data.name, accent: parsed.data.accent, alerts_enabled: parsed.data.alerts_enabled, accreditation_label: parsed.data.accreditation_label, currency: parsed.data.currency, sector: parsed.data.sector, phone: parsed.data.phone, buildings: parsed.data.buildings };

  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    const result = logoToDataUri(new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) return { error: result.error, fieldErrors: { logo: result.error }, values: echoValues(formData) };
    update.logo_data = result.dataUri;
  } else if (formData.get("remove_logo") === "on") {
    update.logo_data = null;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update(update).eq("id", s.tenant.id);
  if (error) return { error: "Enregistrement impossible.", values: echoValues(formData) };
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés." };
}
