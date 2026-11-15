"use server";

import { revalidatePath } from "next/cache";
import { echoValues, parseForm, type FormState } from "@/lib/form";
import { logoToDataUri } from "@/lib/image";
import { brandingSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/session";
import { mailer, missingMailVars, smtpErrorInfo } from "@/lib/mail";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEGAL } from "@/lib/legal";
import { offerById } from "@/lib/plans";

export async function saveBranding(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireAdmin();
  const parsed = parseForm(brandingSchema, formData);
  if ("state" in parsed) return parsed.state;
  const update: Record<string, unknown> = { name: parsed.data.name, alerts_enabled: parsed.data.alerts_enabled, accreditation_label: parsed.data.accreditation_label, currency: parsed.data.currency, sector: parsed.data.sector, phone: parsed.data.phone, buildings: parsed.data.buildings };

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
  // Fuseau horaire enregistré à part : tant que la migration 0013 n'est pas appliquée, le reste s'enregistre quand même.
  if (parsed.data.time_zone && parsed.data.time_zone !== s.timeZone) {
    const { error: tzError } = await supabase.from("tenants").update({ time_zone: parsed.data.time_zone }).eq("id", s.tenant.id);
    if (tzError) {
      revalidatePath("/", "layout");
      return { error: "Paramètres enregistrés, sauf le fuseau horaire : la mise à jour de la base (migration 0013) n'est pas encore appliquée.", values: echoValues(formData) };
    }
  }
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

// Choix de formule depuis l'application : la demande part par e-mail à l'équipe DIOMETRO, qui l'active
// depuis la page Plateforme après paiement (pas de paiement en ligne). Aucun changement direct de formule ici.
export async function requestPlan(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireAdmin();
  const offer = offerById(String(formData.get("plan") ?? ""));
  if (!offer) return { error: "Formule inconnue." };
  if (missingMailVars().length) return { error: "La demande n'a pas pu être envoyée : l'envoi d'e-mails n'est pas encore disponible. Réessayez plus tard." };
  const to = new Set<string>();
  if (LEGAL.email) to.add(LEGAL.email);
  try {
    const admin = createAdminClient();
    const { data: admins } = await admin.from("platform_admins").select("user_id");
    for (const a of admins ?? []) {
      const { data } = await admin.auth.admin.getUserById(a.user_id);
      if (data.user?.email) to.add(data.user.email);
    }
  } catch { /* clé service absente : on se contente de l'adresse de contact */ }
  if (to.size === 0 && process.env.MAIL_FROM) to.add(process.env.MAIL_FROM);
  try {
    await mailer().sendMail({
      from: process.env.MAIL_FROM, to: [...to], replyTo: s.email,
      subject: `DIOMETRO - demande de formule ${offer.nom} - ${s.tenant.name}`,
      text: `Entreprise : ${s.tenant.name}
Demandeur : ${s.displayName} (${s.email})
Formule demandée : ${offer.nom} (${offer.instruments ? `jusqu'à ${offer.instruments} instruments` : "sur devis"})

Activez la formule depuis la page Plateforme une fois le paiement reçu.`,
    });
  } catch (e) {
    console.error("Demande de formule : envoi refusé", smtpErrorInfo(e).code);
    return { error: "La demande n'a pas pu être envoyée. Réessayez plus tard." };
  }
  return { ok: `Demande de formule ${offer.nom} envoyée. Nous vous recontactons pour le règlement ; la formule est activée dès réception.` };
}
