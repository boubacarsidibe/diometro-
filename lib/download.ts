export function fileResponse(bytes: Uint8Array, contentType: string, filename: string): Response {
  // Nom de fichier restreint à des caractères sûrs (pas d'injection d'en-tête).
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
