// Icônes du site vitrine (traits, héritent de la couleur du texte).
type P = { className?: string };
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconArrow = (p: P) => <svg {...base} strokeWidth={2.2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconCheck = (p: P & { w?: number }) => <svg {...base} strokeWidth={p.w ?? 2.4} className={p.className}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const IconPlus = (p: P) => <svg {...base} strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IconBell = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
export const IconQr = (p: P) => <svg {...base} strokeWidth={2} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></svg>;
export const IconCalc = (p: P) => <svg {...base} strokeWidth={2} {...p}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h8" /></svg>;
export const IconFile = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg>;
export const IconDownload = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
export const IconCalendar = (p: P) => <svg {...base} strokeWidth={2} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
export const IconBuilding = (p: P) => <svg {...base} strokeWidth={2} {...p}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01" /></svg>;
export const IconLock = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
export const IconLayers = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><path d="M12 2l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" /></svg>;
export const IconClock = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const IconQrThin = (p: P) => <svg {...base} strokeWidth={1.8} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 20h1" /></svg>;

/** Pseudo-aléatoire stable : la vitrine affiche toujours les mêmes exemples (rendu serveur et navigateur identiques). */
export function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Motif de QR code d'exemple, décoratif (non scannable). */
export function QrPattern({ seed, label }: { seed: number; label?: string }) {
  const r = rng(seed);
  const cells: [number, number][] = [];
  for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
    const inFinder = (x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16);
    if (!inFinder && r() > 0.52) cells.push([x, y]);
  }
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}><rect x={x} y={y} width={7} height={7} fill="#2c0e16" /><rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" /><rect x={x + 2} y={y + 2} width={3} height={3} fill="#2c0e16" /></g>
  );
  return (
    <svg viewBox="0 0 25 25" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect width={25} height={25} fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill="#2c0e16" />)}
      {finder(0, 0)}{finder(18, 0)}{finder(0, 18)}
      <rect x={10} y={10} width={5} height={5} rx={1} fill="#ff6b1a" />
    </svg>
  );
}
