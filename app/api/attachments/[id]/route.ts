import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Téléchargement : la ligne est lue sous RLS (donc limitée à l'entreprise), puis un lien signé de 60 s est émis.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  await requireSession();
  const supabase = await createClient();
  const { data: att } = await supabase.from("attachments").select("storage_path, filename").eq("id", id).maybeSingle();
  if (!att) return new NextResponse("Not found", { status: 404 });
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(att.storage_path, 60, { download: att.filename });
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
