import { NextResponse } from "next/server";
import { z } from "zod";
import { fileResponse } from "@/lib/download";
import { buildFichePdf } from "@/lib/export";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Instrument, Intervention } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  const s = await requireSession();
  const supabase = await createClient();
  const { data: inst } = await supabase.from("instruments").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!inst) return new NextResponse("Not found", { status: 404 });
  const { data: ints } = await supabase.from("interventions").select("*").eq("instrument_id", id).order("date", { ascending: false });
  const bytes = await buildFichePdf(inst as Instrument, (ints ?? []) as Intervention[], { name: s.tenant.name, logo_data: s.tenant.logo_data, accreditation_label: s.tenant.accreditation_label });
  return fileResponse(bytes, "application/pdf", `fiche-de-vie-${(inst as Instrument).ref}.pdf`);
}
