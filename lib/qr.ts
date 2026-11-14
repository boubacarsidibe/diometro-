import QRCode from "qrcode";

export function qrDataUri(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 240, errorCorrectionLevel: "M" });
}

// Image PNG du QR code (export Word des étiquettes).
export async function qrPng(text: string): Promise<Uint8Array> {
  return new Uint8Array(await QRCode.toBuffer(text, { margin: 1, width: 240, errorCorrectionLevel: "M", type: "png" }));
}
