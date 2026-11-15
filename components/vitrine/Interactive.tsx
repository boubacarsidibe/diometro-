"use client";
// Parties animées et interactives du site vitrine. Tout reste lisible sans JavaScript ni animation
// (prefers-reduced-motion) : les effets 3D ne font qu'enrichir un contenu déjà affiché.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { IconArrow, IconCheck, IconClock, IconCopy, IconLayers, IconLock, IconQrThin, rng } from "./icons";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fr = (n: number, d: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (n: number, d: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fr(Math.abs(n), d);

/** Active les entrées en profondeur au défilement (le contenu est visible au repos). */
export function RevealObserver() {
  useEffect(() => {
    const root = document.querySelector(".vt");
    if (!root || reduced() || !("IntersectionObserver" in window)) return;
    root.classList.add("vt-js");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("vt-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    root.querySelectorAll(".vt-reveal").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("vt-in"); else io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}

/** Héros : pied à coulisse orientable à la souris, oscillation lente sur écran tactile. */
export function HeroStage() {
  const stage = useRef<HTMLDivElement>(null);
  const rig = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const st = stage.current, rg = rig.current;
    if (!st || !rg || reduced()) return;
    const hero = st.closest(".vt-hero") as HTMLElement | null;
    const cur = { x: 6, y: -12 }, target = { x: 6, y: -12 };
    let idle = true, raf = 0;
    const t0 = performance.now();
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = st.getBoundingClientRect();
      const px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 1.2)));
      const py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 1.2)));
      target.y = -12 + px * 22; target.x = 6 - py * 14; idle = false;
    };
    const leave = () => { idle = true; };
    const loop = (now: number) => {
      if (idle) { const k = (now - t0) / 1000; target.y = -12 + Math.sin(k * 0.6) * 9; target.x = 6 + Math.sin(k * 0.45) * 4; }
      cur.x += (target.x - cur.x) * 0.07; cur.y += (target.y - cur.y) * 0.07;
      rg.style.setProperty("--rx", `${cur.x.toFixed(2)}deg`); rg.style.setProperty("--ry", `${cur.y.toFixed(2)}deg`);
      raf = requestAnimationFrame(loop);
    };
    hero?.addEventListener("pointermove", move); hero?.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); hero?.removeEventListener("pointermove", move); hero?.removeEventListener("pointerleave", leave); };
  }, []);
  return (
    <div className="vt-stage" ref={stage}>
      <div className="vt-rig" ref={rig}>
        <div className="vt-shadow-disc" aria-hidden="true" />
        <Image className="vt-caliper" src="/vitrine/caliper.webp" width={966} height={889} priority alt="Pied à coulisse numérique DIOMETRO affichant 50,25 mm" />
        <div className="vt-chip vt-status"><div className="vt-row"><span className="vt-dot" />PAC-014 · Conforme</div><div className="vt-k">Prochain étalonnage · 211 j</div></div>
        <div className="vt-chip vt-reading"><div className="vt-k">Cote mesurée</div><div className="vt-v">50,25<small>mm</small></div><div className="vt-tol">Tolérance ±0,05 mm</div></div>
      </div>
      <div className="vt-stage-hint" aria-hidden="true">Déplacez la souris</div>
    </div>
  );
}

// Échéancier d'exemple : 31 instruments répartis de −30 à +90 jours.
const MIN = -30, MAX = 90;
const pos = (d: number) => ((d - MIN) / (MAX - MIN)) * 100;
const MARKERS = (() => {
  const r = rng(42), types = ["BAL", "PIP", "PT", "MAN", "TH", "MIC", "PAC", "MUL", "DEB", "BAR", "CAL"];
  const days = [-27, -14, -6];
  for (let i = 0; i < 6; i++) days.push(1 + Math.round(r() * 13));
  for (let i = 0; i < 6; i++) days.push(15 + Math.round(r() * 15));
  for (let i = 0; i < 16; i++) days.push(31 + Math.round(r() * 58));
  return days.map((d, k) => ({
    d, h: 26 + Math.round(r() * 30),
    c: d < 0 ? "var(--late-d)" : d < 15 ? "var(--due-o-d)" : d <= 30 ? "var(--due-y-d)" : "var(--ok-d)",
    tip: `${types[k % types.length]}-${String(10 + k).padStart(2, "0")}${d < 0 ? ` · retard ${-d} j` : ` · dans ${d} j`}`,
  }));
})();

/** Échéancier incliné en perspective, qui se redresse au défilement. */
export function EcheancierDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const tilt = () => {
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.9)));
      el.style.setProperty("--tilt", `${(reduced() ? 0 : 26 - p * 22).toFixed(1)}deg`);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { tilt(); ticking = false; }); } };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", tilt); tilt();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", tilt); };
  }, []);
  return (
    <div className="vt-ech-scene">
      <div className="vt-ech" ref={ref}>
        <div className="vt-ech-head">
          <div><b>Échéancier</b> · exemple d&apos;un parc de 31 instruments, du retard aux 90 prochains jours</div>
          <div className="vt-legend">
            <span><i style={{ background: "var(--late-d)" }} />En retard</span><span><i style={{ background: "var(--due-o-d)" }} />Moins de 15 j</span>
            <span><i style={{ background: "var(--due-y-d)" }} />15 à 30 j</span><span><i style={{ background: "var(--ok-d)" }} />À jour</span>
          </div>
        </div>
        <div className="vt-track" role="img" aria-label="Échéancier d'exemple : 3 instruments en retard, 6 à moins de 15 jours, 6 entre 15 et 30 jours, 16 à jour.">
          <div className="vt-zone vt-late" style={{ left: 0, width: `${pos(0)}%` }} />
          <div className="vt-zone vt-soon" style={{ left: `${pos(0)}%`, width: `${pos(30) - pos(0)}%` }} />
          <div className="vt-today" style={{ left: `${pos(0)}%` }}><span>Aujourd&apos;hui</span></div>
          {MARKERS.map((m) => (
            <span key={m.tip} className="vt-marker" tabIndex={0} data-tip={m.tip} aria-label={m.tip}
              style={{ left: `${pos(m.d)}%`, height: m.h, background: m.c, boxShadow: "0 6px 14px rgba(0, 0, 0, .35)" }} />
          ))}
        </div>
        <div className="vt-axis" aria-hidden="true">
          {[-30, 0, 15, 30, 60, 90].map((d) => <span key={d} style={{ left: `${pos(d)}%` }}>{d === 0 ? "0" : `${d > 0 ? "+" : "−"}${Math.abs(d)} j`}</span>)}
        </div>
      </div>
    </div>
  );
}

/** Carte qui s'oriente vers la souris, avec reflet de lumière. */
export function Tilt({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: RPointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || reduced()) return;
    const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    el.classList.add("vt-tilting");
    el.style.setProperty("--ty", `${((x - 0.5) * 9).toFixed(2)}deg`); el.style.setProperty("--tx", `${((0.5 - y) * 7).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`); el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
  };
  const leave = () => { const el = ref.current; if (!el) return; el.classList.remove("vt-tilting"); el.style.setProperty("--tx", "0deg"); el.style.setProperty("--ty", "0deg"); };
  return <article ref={ref} className={`vt-card vt-reveal ${className}`} onPointerMove={move} onPointerLeave={leave}>{children}</article>;
}

/** Calculateur d'exemple : comparaison d'un thermomètre à un étalon, EMT ±0,4 °C. */
export function CalcDemo() {
  const EMT = 0.4, SPAN = 0.6, ETALON = 20.0;
  const [v, setV] = useState(20.12);
  const e = Math.round((v - ETALON) * 1000) / 1000;
  const ok = Math.abs(e) <= EMT + 1e-9;
  const p = ((Math.max(-SPAN, Math.min(SPAN, e)) + SPAN) / (2 * SPAN)) * 100;
  return (
    <div className="vt-calc-card vt-reveal">
      <div className="vt-calc-top">
        <div><div className="vt-t">Thermomètre de contrôle · TH-04</div><div className="vt-s">Exemple interactif · comparaison à un étalon</div></div>
        <div className={`vt-verdict${ok ? "" : " vt-bad"}`} aria-live="polite" aria-label={ok ? "Verdict : conforme" : "Verdict : non conforme"}>
          <div className="vt-ok">✓ Conforme</div><div className="vt-ko">✗ Non conforme</div>
        </div>
      </div>
      <div className="vt-readings">
        <div><div className="vt-k">Étalon</div><div className="vt-v">20,000 °C</div></div>
        <div><div className="vt-k">Valeur lue</div><div className="vt-v">{fr(v, 3)} °C</div></div>
        <div><div className="vt-k">Écart</div><div className="vt-v">{signed(e, 3)} °C</div></div>
      </div>
      <div className="vt-gauge-scene" aria-hidden="true">
        <div className="vt-gauge"><div className="vt-pin" style={{ left: `${p}%` }}><div className="vt-base" /><div className="vt-stem" /><div className="vt-head"><span>{signed(e, 2)}</span></div></div></div>
      </div>
      <div className="vt-scale" aria-hidden="true"><span>−0,6</span><b>EMT −0,4</b><span>0</span><b>EMT +0,4</b><span>+0,6 °C</span></div>
      <div className="vt-slider">
        <label htmlFor="vt-lu">Faites varier la valeur lue <output htmlFor="vt-lu">{fr(v, 2)} °C</output></label>
        <input id="vt-lu" type="range" min={19.4} max={20.6} step={0.01} value={v} onChange={(ev) => setV(parseFloat(ev.target.value))}
          style={{ ["--fill" as string]: `${((v - 19.4) / 1.2) * 100}%` }} />
      </div>
    </div>
  );
}

const LAYERS = [
  { k: "ACCÈS", t: "Double authentification", d: "Obligatoire pour chaque utilisateur, avec des rôles administrateur, coordinateur et consultation.", Icon: IconLock },
  { k: "ISOLATION", t: "Données cloisonnées", d: "Chaque entreprise est isolée par la base de données elle-même, et des tests automatisés le vérifient.", Icon: IconLayers },
  { k: "PREUVE", t: "Journal d'audit inaltérable", d: "Chaque modification est tracée avec l'ancienne et la nouvelle valeur, sans possibilité d'effacement.", Icon: IconClock },
  { k: "CONTRÔLE", t: "Lien public maîtrisé", d: "Le QR code ouvre une fiche en lecture seule, limitée aux données utiles au terrain, et son lien est révocable.", Icon: IconQrThin },
];

/** Sécurité : liste des protections (sous l'introduction passée en enfant) reliée à une pile de plaques en vue éclatée. */
export function SecurityStack({ children }: { children: ReactNode }) {
  const [on, setOn] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    if (reduced() || !("IntersectionObserver" in window)) { setOpen(true); return; }
    const io = new IntersectionObserver(([e]) => setOpen(e.isIntersecting), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="vt-wrap vt-sec-grid">
      <div>
      {children}
      <div className="vt-sec-list">
        {LAYERS.map((l, i) => (
          <button key={l.k} type="button" className={`vt-sec-item${on === i ? " vt-on" : ""}`} onPointerEnter={() => setOn(i)} onFocus={() => setOn(i)} onClick={() => setOn(i)}>
            <span className="vt-k">{l.k}</span><h3>{l.t}</h3><p>{l.d}</p>
          </button>
        ))}
      </div>
      </div>
      <div className={`vt-iso-scene${open ? " vt-open" : ""}`} ref={scene} aria-hidden="true">
        <div className="vt-iso">
          {/* La plaque du bas est la dernière protection de la liste (contrôle), celle du haut la première (accès). */}
          {[...LAYERS].reverse().map((l, k) => {
            const i = LAYERS.length - 1 - k;
            return (
              <div key={l.k} className={`vt-plate${on === i ? " vt-on" : ""}`} style={{ ["--i" as string]: k }}>
                <l.Icon className="vt-pi" /><span className="vt-pl">{l.k}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type VitrineOffer = { id: string; nom: string; cible: string; instruments: number | null; prix: { mensuel: number; annuel: number } | null };

/** Formules : choix de la taille du parc, la formule adaptée s'avance. */
export function PlanPicker({ offers }: { offers: VitrineOffer[] }) {
  const [n, setN] = useState(120);
  const [annual, setAnnual] = useState(false);
  const priced = offers.filter((o) => o.prix);
  // Remise annuelle affichée seulement si des prix existent (calculée sur la première formule tarifée).
  const discount = priced[0]?.prix ? Math.round((1 - priced[0].prix.annuel / (12 * priced[0].prix.mensuel)) * 100) : 0;
  const fitIndex = Math.max(0, offers.findIndex((o) => o.instruments === null || n <= o.instruments));
  return (
    <>
      <div className="vt-pr-controls">
        {priced.length > 0 && (
          <div className="vt-toggle" role="group" aria-label="Période de facturation">
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>Mensuel</button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>Annuel{discount > 0 && <span className="vt-off">−{discount} %</span>}</button>
          </div>
        )}
        <div className="vt-sizer">
          <div className="vt-sizer-top">
            <div><div className="vt-k">Taille de votre parc</div><div className="vt-big">{n.toLocaleString("fr-FR")}<small>instruments</small></div></div>
            <div className="vt-fit"><div className="vt-k">Formule adaptée</div><b>{offers[fitIndex]?.nom}</b></div>
          </div>
          <input type="range" min={10} max={2500} step={10} value={n} onChange={(e) => setN(+e.target.value)}
            aria-label="Taille de votre parc, en nombre d'instruments" style={{ ["--fill" as string]: `${((n - 10) / 2490) * 100}%` }} />
        </div>
      </div>
      <div className="vt-plans">
        {offers.map((o, k) => {
          const custom = o.instruments === null;
          const href = custom ? "/devis?formule=custom" : `/register?formule=${o.id}`;
          const label = custom ? "Demander un devis" : `Essayer ${o.nom}`;
          return (
            <article key={o.id} className={`vt-plan${k === fitIndex ? " vt-fit" : ""}`}>
              <span className="vt-badge">Adaptée</span>
              <div><h3>{o.nom}</h3><div className="vt-cible">{o.cible}</div></div>
              {o.prix
                ? <div className="vt-price">{(annual ? Math.round(o.prix.annuel / 12) : o.prix.mensuel).toLocaleString("fr-FR")} <small>FCFA HT / mois{annual ? ", facturé à l'année" : ""}</small></div>
                : <div className="vt-price vt-quote">{custom ? "Sur devis" : "Tarif communiqué prochainement"}</div>}
              <Link className="vt-btn vt-ghost" href={href}>{label} <IconArrow /></Link>
              <ul className="vt-feat">
                <li><IconCheck />{o.instruments ? `Jusqu'à ${o.instruments.toLocaleString("fr-FR")} instruments` : "Plus de 2 000 instruments"}</li>
                <li><IconCheck />Toutes les fonctionnalités incluses</li>
                <li><IconCheck />Alertes d&apos;échéance par e-mail</li>
                <li><IconCheck />Calculateurs de conformité</li>
                <li><IconCheck />QR codes, exports et journal d&apos;audit</li>
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}

// Bouton « Copier » de la section Contact.
export function CopyText({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* copie refusée : l'adresse reste affichée et sélectionnable */ }
  }
  return (
    <button type="button" className="vt-copy" onClick={copy} aria-label={label}>
      {done ? <IconCheck /> : <IconCopy />}<span>{done ? "Copié" : "Copier"}</span>
    </button>
  );
}
