// Export Word (.docx) des étiquettes QR, sans dépendance : un .docx est une archive ZIP de fichiers XML.
// Repris de la version locale (exportEtiquettesDocx) : tableau d'étiquettes, N par rangée, triées par bâtiment.

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// ── ZIP minimal (fichiers stockés sans compression) ─────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // date fixe : contenu identique d'un export à l'autre
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, 0, true);
    local.setUint16(10, DOS_TIME, true); local.setUint16(12, DOS_DATE, true); local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true); local.setUint32(22, f.data.length, true); local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, f.data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true);
    cen.setUint16(12, DOS_TIME, true); cen.setUint16(14, DOS_DATE, true); cen.setUint32(16, crc, true);
    cen.setUint32(20, f.data.length, true); cen.setUint32(24, f.data.length, true); cen.setUint16(28, name.length, true);
    cen.setUint16(30, 0, true); cen.setUint16(32, 0, true); cen.setUint16(34, 0, true); cen.setUint16(36, 0, true); cen.setUint32(38, 0, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cenSize = central.reduce((n, c) => n + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

// ── Document Word ───────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const run = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
  `<w:r><w:rPr>${opts.bold ? "<w:b/>" : ""}${opts.color ? `<w:color w:val="${opts.color}"/>` : ""}<w:sz w:val="${opts.size ?? 18}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (inner: string, center = true) => `<w:p><w:pPr>${center ? '<w:jc w:val="center"/>' : ""}<w:spacing w:before="0" w:after="20"/></w:pPr>${inner}</w:p>`;

function image(rid: string, n: number, emu: number): string {
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu}" cy="${emu}"/><wp:docPr id="${n}" name="QR ${n}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="qr${n}.png"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu}" cy="${emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

export type DocxLabel = { ref: string; designation: string; building: string; location: string; color: string; png: Uint8Array };

/** Étiquettes en tableau (perRow par rangée), bandeau de couleur du bâtiment en haut de chaque case. */
export function buildLabelsDocx(labels: DocxLabel[], perRow: number, title: string): Uint8Array {
  const n = Math.min(5, Math.max(1, Math.round(perRow)));
  const pageW = 11906 - 2 * 720; // A4 en twips, marges 1,27 cm
  const colW = Math.floor(pageW / n);
  const emu = Math.round(Math.min(1.0, 4.2 / n + 0.35) * 914400); // taille du QR selon le nombre par rangée
  const cell = (l: DocxLabel | undefined, i: number) => {
    const borders = `<w:tcBorders><w:top w:val="single" w:sz="36" w:color="${l ? l.color.replace("#", "") : "FFFFFF"}"/>` +
      `<w:left w:val="single" w:sz="4" w:color="D0D5DD"/><w:bottom w:val="single" w:sz="4" w:color="D0D5DD"/><w:right w:val="single" w:sz="4" w:color="D0D5DD"/></w:tcBorders>`;
    const body = l
      ? para(image(`rIdQr${i}`, i + 1, emu)) + para(run(l.building, { bold: true, size: 14, color: l.color.replace("#", "") })) +
        para(run(l.ref, { bold: true, size: 22 })) + para(run(l.designation, { size: 16 })) + (l.location ? para(run(l.location, { size: 14, color: "667085" })) : "")
      : para("");
    return `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${borders}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/></w:tcMar></w:tcPr>${body}</w:tc>`;
  };
  const rows: string[] = [];
  for (let r = 0; r < labels.length; r += n) {
    const cells = Array.from({ length: n }, (_, k) => cell(labels[r + k], r + k)).join("");
    rows.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr>`);
  }
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>` +
    para(run(title, { bold: true, size: 24 }), false) +
    `<w:tbl><w:tblPr><w:tblW w:w="${colW * n}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${colW}"/>`.repeat(n)}</w:tblGrid>${rows.join("")}</w:tbl>` +
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>` +
    `</w:body></w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    labels.map((_, i) => `<Relationship Id="rIdQr${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/qr${i}.png"/>`).join("") +
    `</Relationships>`;
  const enc = new TextEncoder();
  return zipStore([
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { name: "word/document.xml", data: enc.encode(document) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(rels) },
    ...labels.map((l, i) => ({ name: `word/media/qr${i}.png`, data: l.png })),
  ]);
}
