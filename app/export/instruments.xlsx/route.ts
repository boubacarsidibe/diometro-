import { fileResponse, XLSX_MIME } from "@/lib/download";
import { buildInstrumentsXlsx } from "@/lib/export";
import { requireSession } from "@/lib/session";
import { todayIn } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Instrument } from "@/lib/types";

export async function GET() {
  const s = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("*").is("deleted_at", null).order("ref");
  const bytes = await buildInstrumentsXlsx((data ?? []) as Instrument[], s.tenant.name, new Date(), s.timeZone);
  return fileResponse(bytes, XLSX_MIME, `instruments-${todayIn(s.timeZone)}.xlsx`);
}
