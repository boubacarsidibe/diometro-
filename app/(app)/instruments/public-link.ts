"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canWrite, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function setPublicLink(instrumentId: string, enabled: boolean): Promise<{ ok: boolean }> {
  const s = await requireSession();
  if (!canWrite(s.role) || !z.uuid().safeParse(instrumentId).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_public_link", { p_instrument: instrumentId, p_enabled: enabled });
  revalidatePath(`/instruments/${instrumentId}`);
  return { ok: !error };
}
