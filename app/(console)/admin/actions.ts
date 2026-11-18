"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isMailConfigured, mailer, missingMailVars, smtpErrorInfo } from "@/lib/mail";
import { parseForm, type FormState } from "@/lib/form";
import { platformTenantSchema } from "@/lib/schemas";
import { requirePlatformAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function setTenant(_: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  const parsed = parseForm(platformTenantSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_update_tenant", {
    p_tenant: parsed.data.tenant_id, p_status: parsed.data.status, p_plan: parsed.data.plan, p_expires: parsed.data.expires, p_max: parsed.data.max_instruments,
  });
  if (error) return { error: "Mise à jour refusée." };
  revalidatePath("/admin", "layout");
  return { ok: "Enregistré." };
}

const relanceSchema = z.object({
  tenant_id: z.uuid(),
  subject: z.string().trim().min(1, "Objet obligatoire.").max(150),
  body: z.string().trim().min(1, "Message obligatoire.").max(4000),
});

// Relance d'une entreprise : e-mail à son administrateur (adresse lue côté serveur, jamais fournie par le formulaire),
// réponse renvoyée vers l'administrateur de la plateforme, puis trace dans le journal.
export async function sendRelance(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requirePlatformAdmin();
  const parsed = parseForm(relanceSchema, formData);
  if ("state" in parsed) return parsed.state;
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_overview");
  const t = ((data ?? []) as { id: string; admin_email?: string | null }[]).find((x) => x.id === parsed.data.tenant_id);
  if (!t?.admin_email) return { error: "Aucune adresse d'administrateur connue pour cette entreprise." };
  if (!isMailConfigured()) {
    console.error("Relance impossible : variables d'envoi manquantes", missingMailVars());
    return { error: "L'envoi d'e-mails n'est pas configuré sur le serveur (SMTP). Aucune relance n'est partie." };
  }
  try {
    await mailer().sendMail({
      from: process.env.MAIL_FROM, to: t.admin_email, replyTo: s.email || undefined,
      subject: parsed.data.subject, text: `${parsed.data.body}\n\n${s.displayName}\nDIOMETRO`,
    });
  } catch (e) {
    const { code, message } = smtpErrorInfo(e);
    return { error: `Envoi refusé par le serveur (${code}) : ${message}` };
  }
  const { error } = await supabase.rpc("platform_log_relance", { p_tenant: t.id, p_to: t.admin_email, p_subject: parsed.data.subject });
  if (error) console.error("Relance envoyée mais non journalisée", error.message);
  revalidatePath("/admin", "layout");
  return { ok: `Relance envoyée à ${t.admin_email}.` };
}
