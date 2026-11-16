import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Journal des connexions : écrit dans audit_log (entity "sessions") avec la clé serveur,
// car le journal n'accepte aucune écriture depuis le navigateur.
// Aucune adresse IP ni empreinte d'appareil n'est enregistrée : seulement qui, quand et quoi.
export type SessionEvent = "login" | "login_failed" | "logout";

export async function logSessionEvent(userId: string, action: SessionEvent, detail: Record<string, string> = {}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("tenant_id").eq("user_id", userId).maybeSingle();
    if (!profile?.tenant_id) { console.error("Journal des connexions : profil introuvable", action); return; }
    const { error } = await admin.from("audit_log").insert({ tenant_id: profile.tenant_id, user_id: userId, action, entity: "sessions", entity_id: userId, detail });
    if (error) console.error("Journal des connexions : écriture refusée", action, error.code, error.message);
    else console.info("Journal des connexions : enregistré", action);
  } catch (e) {
    // Journal indisponible (clé serveur absente) : la connexion elle-même n'est jamais bloquée.
    console.error("Journal des connexions : indisponible", action, e instanceof Error ? e.message : "erreur");
  }
}
