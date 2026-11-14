"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseForm, type FormState } from "@/lib/form";
import { publicEnv } from "@/lib/env";
import { passwordSchema } from "@/lib/schemas";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const changeSchema = z.object({
  current_password: z.string().min(1, "Saisissez votre mot de passe actuel.").max(128),
  password: passwordSchema,
  confirm: z.string().max(128),
}).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les deux mots de passe ne sont pas identiques." })
  .refine((d) => d.password !== d.current_password, { path: ["password"], message: "Choisissez un mot de passe différent de l'actuel." });

// Changement de mot de passe depuis l'application (repris de la version locale : changeOwnPassword).
// Le mot de passe actuel est vérifié sur une connexion séparée, qui est aussitôt fermée : la session en cours
// (double authentification comprise) n'est pas touchée.
export async function changeOwnPassword(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireSession();
  const parsed = parseForm(changeSchema, formData);
  if ("state" in parsed) return parsed.state;

  const { url, key } = publicEnv();
  const check = createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error: wrong } = await check.auth.signInWithPassword({ email: s.email, password: parsed.data.current_password });
  if (wrong) return { fieldErrors: { current_password: "Mot de passe actuel incorrect." }, error: "Mot de passe actuel incorrect." };
  await check.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Changement impossible pour le moment. Réessayez dans quelques minutes." };
  return { ok: "Mot de passe modifié. Utilisez-le dès votre prochaine connexion." };
}
