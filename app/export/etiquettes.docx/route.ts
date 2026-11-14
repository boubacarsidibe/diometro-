import { z } from "zod";
import { DOCX_MIME, buildLabelsDocx } from "@/lib/docx";
import { fileResponse } from "@/lib/download";
import { buildingColors, NO_BUILDING } from "@/lib/labels";
import { appOrigin } from "@/lib/origin";
import { qrPng } from "@/lib/qr";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const MAX = 150;

// Export Word des étiquettes choisies sur la page Étiquettes (formulaire POST : ids + nombre par rangée).
export async function POST(request: Request) {
  const s = await requireSession();
  const form = await request.formData();
  const ids = form.getAll("ids").map(String).filter((v) => z.uuid().safeParse(v).success).slice(0, MAX);
  const perRow = Math.min(5, Math.max(1, Number(form.get("par_rangee")) || 3));
  if (!ids.length) return new Response("Aucun instrument sélectionné.", { status: 400 });

  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("id, ref, designation, batiment, zone, public_token")
    .in("id", ids).is("deleted_at", null).not("public_token", "is", null);
  const rows = (data ?? []) as { id: string; ref: string; designation: string; batiment: string | null; zone: string | null; public_token: string }[];
  const { data: all } = await supabase.from("instruments").select("batiment").is("deleted_at", null).limit(5000);
  const color = buildingColors((all ?? []).map((r) => (r.batiment as string | null) ?? ""));
  const origin = await appOrigin();
  // Même ordre que la version locale : par bâtiment, puis par désignation.
  rows.sort((a, b) => (a.batiment ?? "").localeCompare(b.batiment ?? "", "fr") || a.designation.localeCompare(b.designation, "fr"));
  const labels = await Promise.all(rows.map(async (r) => ({
    ref: r.ref, designation: r.designation, building: r.batiment || NO_BUILDING,
    location: [r.batiment, r.zone].filter(Boolean).join(" · "), color: color(r.batiment ?? ""),
    png: await qrPng(`${origin}/p/${r.public_token}`),
  })));
  const bytes = buildLabelsDocx(labels, perRow, `Étiquettes métrologiques · ${s.tenant.name}`);
  return fileResponse(bytes, DOCX_MIME, `etiquettes-${new Date().toISOString().slice(0, 10)}.docx`);
}
