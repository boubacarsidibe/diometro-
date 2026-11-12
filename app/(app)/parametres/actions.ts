"use server";

import { revalidatePath } from "next/cache";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { logoToDataUri } from "@/lib/image";
import { brandingSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/session";
import { mailer, missingMailVars, smtpErrorInfo } from "@/lib/mail";
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

// Vérifie la configuration d'envoi : un email de test part vers l'adresse de l'administrateur connecté (jamais ailleurs).
export async function sendTestEmail(): Promise<FormState> {
  const s = await requireAdmin();
  const missing = missingMailVars();
  if (missing.length) {
    // Détail technique réservé aux journaux du serveur : le client voit un message compréhensible.
    console.error("Envoi d'emails non configuré : variables manquantes", missing);
    return { error: "L'envoi d'emails n'est pas encore configuré sur le serveur. Les alertes d'échéance ne peuvent pas partir pour le moment : contactez le support DIOMETRO." };
  }
  try {
    await mailer().sendMail({
      from: process.env.MAIL_FROM, to: s.email, subject: "DIOMETRO - email de test",
      text: `Bonjour ${s.displayName},\n\nSi vous recevez ce message, l'envoi d'emails de DIOMETRO (alertes d'échéance) fonctionne.`,
    });
    return { ok: `Email de test envoyé à ${s.email}. Vérifiez votre boîte de réception (et les spams).` };
  } catch (e) {
    const { code, message } = smtpErrorInfo(e);
    return { error: `Envoi refusé par le serveur (${code}) : ${message}` };
  }
}
