// Compression des photos côté navigateur : les photos de tablette dépassent vite 10 Mo.
// Redimensionne (côté le plus long ≤ maxSide) et ré-encode en JPEG, puis baisse la qualité jusqu'à tenir sous maxBytes.

export type CompressOptions = { maxSide?: number; quality?: number; maxBytes?: number };

export class ImageDecodeError extends Error {}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const bmp = await createImageBitmap(file);
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    // Repli : élément <img> (applique l'orientation EXIF sur les navigateurs récents).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => undefined };
    } catch {
      throw new ImageDecodeError("Format d'image non pris en charge par ce navigateur (HEIC ?). Réglez l'appareil photo sur « Le plus compatible » ou choisissez une image JPEG/PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible"))), "image/jpeg", quality));

export async function compressImage(file: File, { maxSide = 2000, quality = 0.82, maxBytes = 3 * 1024 * 1024 }: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const img = await decode(file);
  try {
    const longSide = Math.max(img.width, img.height);
    // Déjà petite et légère : on garde l'original.
    if (file.size <= 1024 * 1024 && longSide <= maxSide) return file;

    let scale = Math.min(1, maxSide / longSide);
    let q = quality;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Compression impossible");
      ctx.fillStyle = "#ffffff"; // JPEG sans transparence : fond blanc plutôt que noir
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img.source, 0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, q);
      if (blob.size <= maxBytes) break;
      if (q > 0.55) q -= 0.1; else scale *= 0.8;
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    img.close();
  }
}
