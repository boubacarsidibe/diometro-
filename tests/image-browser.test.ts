import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Test dans un vrai navigateur (Chromium) : la compression utilise canvas et createImageBitmap, absents de Node.
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium";
const playwrightPath = ["/opt/node22/lib/node_modules/playwright", "playwright"].find((p) => { try { createRequire(import.meta.url).resolve(p); return true; } catch { return false; } });

describe.skipIf(!existsSync(CHROMIUM) || !playwrightPath)("compression des photos (navigateur réel)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any; let page: any; // playwright n'est pas une dépendance du projet : chargé dynamiquement

  beforeAll(async () => {
    const { chromium } = createRequire(import.meta.url)(playwrightPath!);
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage();
    // lib/image-client.ts n'a aucun import : on le traduit en JavaScript et on l'expose sous le nom IC.
    const js = ts.transpileModule(readFileSync("lib/image-client.ts", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText.replace(/^export /gm, "");
    await page.setContent("<html><body></body></html>");
    await page.addScriptTag({ content: `var IC = (function () { ${js}\n return { compressImage, ImageDecodeError }; })();` });
  }, 60000);
  afterAll(async () => { await browser?.close(); });

  const run = (body: string) => page.evaluate(`(async () => { ${body} })()`);
  const MAKE = `
    async function makePhoto(w, h, type, q) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h);
      let s = 12345; for (let i = 0; i < img.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; img.data[i] = s & 255; img.data[i+1] = (s >> 8) & 255; img.data[i+2] = (s >> 16) & 255; img.data[i+3] = 255; }
      ctx.putImageData(img, 0, 0);
      const blob = await new Promise((r) => c.toBlob(r, type, q));
      return new File([blob], 'photo.' + (type === 'image/png' ? 'png' : 'jpg'), { type });
    }`;

  it("une photo de tablette de plus de 10 Mo ressort sous 3 Mo, en JPEG, redimensionnée", async () => {
    const r = await run(`${MAKE}
      const f = await makePhoto(4000, 3000, 'image/png');
      const out = await IC.compressImage(f);
      const bmp = await createImageBitmap(out);
      return { avant: f.size, apres: out.size, type: out.type, nom: out.name, w: bmp.width, h: bmp.height };`);
    expect(r.avant).toBeGreaterThan(10 * 1024 * 1024);
    expect(r.apres).toBeLessThanOrEqual(3 * 1024 * 1024);
    expect(r.type).toBe("image/jpeg");
    expect(r.nom).toBe("photo.jpg");
    expect(Math.max(r.w, r.h)).toBeLessThanOrEqual(2000);
    expect(r.w / r.h).toBeCloseTo(4 / 3, 1); // proportions conservées
  }, 120000);

  it("une petite image est conservée telle quelle (pas de recompression inutile)", async () => {
    const r = await run(`${MAKE}
      const f = await makePhoto(300, 200, 'image/jpeg', 0.8);
      const out = await IC.compressImage(f);
      return { same: out === f, size: f.size };`);
    expect(r.size).toBeLessThan(1024 * 1024);
    expect(r.same).toBe(true);
  });

  it("les fichiers qui ne sont pas des images (PDF) ne sont pas touchés", async () => {
    const r = await run(`const f = new File([new Uint8Array(2000)], 'cert.pdf', { type: 'application/pdf' }); return (await IC.compressImage(f)) === f;`);
    expect(r).toBe(true);
  });

  it("une image PNG transparente est aplatie sur fond blanc (pas de fond noir)", async () => {
    const r = await run(`
      const c = document.createElement('canvas'); c.width = 3000; c.height = 2500; // PNG transparent, assez grand pour être recompressé
      const ctx = c.getContext('2d'); const d = ctx.createImageData(3000, 2500); // tout à 0 = transparent
      for (let i = 0; i < d.data.length; i += 4) { d.data[i] = (i / 4) % 251; }
      ctx.putImageData(d, 0, 0); ctx.clearRect(0, 0, 3000, 2500);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      const f = new File([new Uint8Array(await blob.arrayBuffer()), new Uint8Array(1100 * 1024)], 'logo.png', { type: 'image/png' });
      const out = await IC.compressImage(f).catch((e) => e);
      if (out instanceof Error) return { erreur: out.constructor.name };
      const bmp = await createImageBitmap(out); const t = document.createElement('canvas'); t.width = 4; t.height = 4;
      const tctx = t.getContext('2d'); tctx.drawImage(bmp, 0, 0, 4, 4); const px = tctx.getImageData(1, 1, 1, 1).data;
      return { r: px[0], g: px[1], b: px[2] };`);
    expect(r.erreur).toBeUndefined();
    expect(r.r).toBeGreaterThan(240); expect(r.g).toBeGreaterThan(240); expect(r.b).toBeGreaterThan(240);
  }, 120000);

  it("un fichier image illisible (HEIC, corrompu) donne un message clair", async () => {
    const r = await run(`
      const f = new File([new Uint8Array(4000).fill(7)], 'IMG_0001.heic', { type: 'image/heic' });
      try { await IC.compressImage(f); return { ok: true }; } catch (e) { return { ok: false, classe: e.constructor.name, msg: e.message }; }`);
    expect(r.ok).toBe(false);
    expect(r.msg).toMatch(/Format d'image non pris en charge/);
  });
});
