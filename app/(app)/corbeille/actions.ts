"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

export async function restoreItem(table: "instruments" | "prestataires", id: string) {
  await requireAdmin();
  if (!uuid.safeParse(id).success || (table !== "instruments" && table !== "prestataires")) return;
  const supabase = await createClient();
  await supabase.from(table).update({ deleted_at: null }).eq("id", id);
  revalidatePath("/corbeille");
  revalidatePath("/", "layout");
}
