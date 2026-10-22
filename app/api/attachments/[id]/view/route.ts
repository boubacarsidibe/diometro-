import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Aperçu en ligne : uniquement images et PDF, servis avec un type figé, sans script (CSP sandbox) et jamais mis en cache.
const PREVIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  await requireSession();
  const supabase = await createClient();
  const { data: att } = await supabase.from("attachments").select("storage_path, mime").eq("id", id).maybeSingle();
  if (!att || !PREVIEWABLE.has(att.mime)) return new NextResponse("Not found", { status: 404 });
  const { data: blob, error } = await supabase.storage.from("attachments").download(att.storage_path);
  if (error || !blob) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(await blob.arrayBuffer(), {
    headers: {
      "Content-Type": att.mime,
      "Content-Disposition": "inline",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
