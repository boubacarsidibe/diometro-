export const MAX_LOGO_BYTES = 150 * 1024;

// Vérifie la signature réelle du fichier (pas seulement le type déclaré) : PNG, JPEG ou WebP. Pas de SVG (XSS).
export function detectImageMime(b: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function logoToDataUri(b: Uint8Array): { ok: true; dataUri: string } | { ok: false; error: string } {
  if (b.length === 0) return { ok: false, error: "Fichier vide." };
  if (b.length > MAX_LOGO_BYTES) return { ok: false, error: "Logo trop lourd (150 Ko maximum)." };
  const mime = detectImageMime(b);
  if (!mime) return { ok: false, error: "Format non accepté (PNG, JPEG ou WebP)." };
  return { ok: true, dataUri: `data:${mime};base64,${Buffer.from(b).toString("base64")}` };
}
