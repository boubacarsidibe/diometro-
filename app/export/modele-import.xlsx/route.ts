import { NextResponse } from "next/server";
import { fileResponse, XLSX_MIME } from "@/lib/download";
import { buildImportTemplate } from "@/lib/import";
import { canEdit, requireSession } from "@/lib/session";

export async function GET() {
  const s = await requireSession();
  if (!canEdit(s)) return new NextResponse("Accès refusé", { status: 403 });
  return fileResponse(await buildImportTemplate(), XLSX_MIME, "modele-import-diometro.xlsx");
}
