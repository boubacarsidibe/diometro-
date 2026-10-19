"use server";

import { revalidatePath } from "next/cache";
import { parseForm, type FormState } from "@/lib/form";
import { inviteSchema, memberSchema } from "@/lib/schemas";
import { requireManager } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateMember(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireManager();
  const parsed = parseForm(memberSchema, formData);
  if ("state" in parsed) return parsed.state;
  if (s.role !== "admin" && parsed.data.role === "admin") return { error: "Seul un administrateur peut attribuer ce rôle." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, active: parsed.data.active })
    .eq("user_id", parsed.data.user_id)
    .eq("tenant_id", s.tenant.id)
    .select("user_id");
  if (error) return { error: error.message.includes("dernier administrateur") ? "Impossible de retirer le dernier administrateur actif." : "Mise à jour impossible." };
  if (!data?.length) return { error: "Membre introuvable." };
  revalidatePath("/users");
  return { ok: "Membre mis à jour." };
}

export async function inviteMember(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireManager();
  const parsed = parseForm(inviteSchema, formData);
  if ("state" in parsed) return parsed.state;
  if (s.role !== "admin" && parsed.data.role === "admin") return { error: "Seul un administrateur peut inviter un administrateur." };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email);
    if (error || !data.user) return { error: "Invitation impossible (adresse déjà utilisée ?)." };
    const { error: pErr } = await admin.from("profiles").insert({
      user_id: data.user.id, tenant_id: s.tenant.id, display_name: parsed.data.displayName, role: parsed.data.role,
    });
    if (pErr) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: "Invitation impossible." };
    }
  } catch {
    return { error: "Service d'invitation non configuré." };
  }
  revalidatePath("/users");
  return { ok: "Invitation envoyée." };
}
