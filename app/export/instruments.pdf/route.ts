import { fileResponse } from "@/lib/download";
import { buildInstrumentsPdf } from "@/lib/export";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Instrument } from "@/lib/types";

export async function GET() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).order("ref");
  const bytes = await buildInstrumentsPdf((data ?? []) as Instrument[], s.tenant.name);
  return fileResponse(bytes, "application/pdf", `instruments-${new Date().toISOString().slice(0, 10)}.pdf`);
}
