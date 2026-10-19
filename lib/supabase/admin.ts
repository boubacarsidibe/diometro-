import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

// Clé service_role : serveur uniquement, jamais exposée au navigateur. Sert aux invitations.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (requise pour inviter des membres)");
  return createClient(publicEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
