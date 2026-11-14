"use client";
// Cartes des pages de connexion, reprises de la maquette validée le 14/11/2026.
// - AuthSwitcher (/login et /register) : les deux formulaires sur la même carte ; un volet bordeaux en biais
//   balaie la carte pour passer de l'un à l'autre (l'adresse passe de /login à /register sans recharger).
// - AuthFrame : pour les autres étapes (mot de passe oublié, double authentification…), même carte avec un volet fixe.
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Mode = "login" | "signup";
type Pt = [string, string];

// Polygones du volet [haut-gauche, haut-droit, bas-droit, bas-gauche]. Sur téléphone, le volet est un bandeau en haut.
const WIDE: Record<"login" | "signup" | "cover", Pt[]> = {
  login: [["-14%", "0%"], ["50%", "0%"], ["40%", "100%"], ["-24%", "100%"]],
  cover: [["-14%", "0%"], ["124%", "0%"], ["114%", "100%"], ["-24%", "100%"]],
  signup: [["60%", "0%"], ["124%", "0%"], ["114%", "100%"], ["50%", "100%"]],
};
const NARROW: Record<"login" | "signup" | "cover", Pt[]> = {
  login: [["0%", "0px"], ["100%", "0px"], ["100%", "246px"], ["0%", "272px"]],
  signup: [["0%", "0px"], ["100%", "0px"], ["100%", "246px"], ["0%", "272px"]],
  cover: [["0%", "0px"], ["100%", "0px"], ["100%", "104%"], ["0%", "104%"]],
};
const poly = (p: Pt[], grow = 0) =>
  `polygon(${p.map(([x, y], i) => `calc(${x} ${i === 0 || i === 3 ? "-" : "+"} ${grow}%) ${y}`).join(", ")})`;
const isNarrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Arrow = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
  </svg>
);

function Brand() {
  return (
    <Link className="au-brand" href="/" aria-label="DIOMETRO, accueil">
      <Image className="au-mark" src="/vitrine/logo-mark-clair.webp" width={107} height={96} alt="" priority />
      <Image className="au-word" src="/vitrine/logo-texte-clair.webp" width={307} height={44} alt="DIOMETRO" priority />
    </Link>
  );
}

function useShape(band: React.RefObject<HTMLDivElement | null>, seam: React.RefObject<HTMLDivElement | null>, mode: "login" | "signup") {
  useEffect(() => {
    const apply = () => {
      const s = (isNarrow() ? NARROW : WIDE)[mode];
      if (band.current) band.current.style.clipPath = poly(s);
      if (seam.current) seam.current.style.clipPath = poly(s, 0.7);
    };
    apply();
    const mq = window.matchMedia("(max-width: 760px)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [band, seam, mode]);
}

export function AuthSwitcher({ initial, login, signup, trialDays }: { initial: Mode; login: ReactNode; signup: ReactNode; trialDays: number }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [welcome, setWelcome] = useState<Mode | null>(initial);
  const [cover, setCover] = useState(false);
  const band = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const shown = useRef<Mode>(initial); // forme actuellement dessinée par le volet
  useShape(band, seam, shown.current);

  const go = (next: Mode) => {
    if (next === shown.current || busy.current) return;
    const cur = shown.current;
    shown.current = next;
    window.history.replaceState(null, "", next === "login" ? "/login" : "/register");
    setWelcome(null);
    const shapes = isNarrow() ? NARROW : WIDE;
    const b = band.current, s = seam.current;
    if (!b || !s || reduced() || !b.animate) {
      if (b) b.style.clipPath = poly(shapes[next]);
      if (s) s.style.clipPath = poly(shapes[next], 0.7);
      setMode(next); setWelcome(next);
      return;
    }
    busy.current = true;
    const D = 1150;
    const frames = (grow: number) => [shapes[cur], shapes.cover, shapes.cover, shapes[next]]
      .map((p, i) => ({ clipPath: poly(p, grow), offset: [0, 0.42, 0.58, 1][i] }));
    const opts: KeyframeAnimationOptions = { duration: D, easing: "cubic-bezier(.7, 0, .25, 1)", fill: "forwards" };
    const a = b.animate(frames(0), opts);
    s.animate(frames(0.7), opts);
    window.setTimeout(() => setCover(true), 380);
    window.setTimeout(() => setMode(next), D * 0.5); // les formulaires s'échangent sous le volet
    window.setTimeout(() => { setCover(false); setWelcome(next); }, D * 0.62);
    a.onfinish = () => {
      b.style.clipPath = poly(shapes[next]); s.style.clipPath = poly(shapes[next], 0.7);
      b.getAnimations().forEach((x) => x.cancel()); s.getAnimations().forEach((x) => x.cancel());
      busy.current = false;
      document.getElementById(next === "login" ? "login-email" : "signup-email")?.focus({ preventScroll: true });
    };
  };

  // Les liens « Se connecter » / « Inscrire mon entreprise » des formulaires basculent sans recharger la page.
  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-au-go]");
    if (!el) return;
    e.preventDefault();
    go(el.dataset.auGo as Mode);
  };

  return (
    <div className="au-inner">
      <div className="au-top">
        <Link className="au-home" href="/">← Accueil</Link>
        <nav className="au-switch" aria-label="Connexion ou inscription">
          <a href="/login" data-au-go="login" aria-current={mode === "login" ? "page" : undefined} onClick={onClick}>Connexion</a>
          <a href="/register" data-au-go="signup" aria-current={mode === "signup" ? "page" : undefined} onClick={onClick}>Inscription</a>
        </nav>
        <span aria-hidden="true" />
      </div>
      <div className="au-card" onClick={onClick}>
        <section className="au-pane au-signup" inert={mode !== "signup"} aria-label="Inscription">{signup}</section>
        <section className="au-pane au-login" inert={mode !== "login"} aria-label="Connexion">{login}</section>
        <div className="au-seam" ref={seam} aria-hidden="true" style={{ clipPath: poly(WIDE[initial], 0.7) }} />
        <div className="au-band" ref={band} style={{ clipPath: poly(WIDE[initial]) }}>
          <div className={`au-welcome au-w-login${welcome === "login" ? "" : " au-off"}`} aria-hidden={welcome !== "login"}>
            <Brand />
            <span className="au-kicker">Suivi métrologique</span>
            <h2>Bon <em>retour.</em></h2>
            <p>Vos instruments vous attendent : échéances, alertes et preuves d&apos;audit au même endroit.</p>
            <a className="au-ghost" href="/register" data-au-go="signup" tabIndex={welcome === "login" ? 0 : -1}>Inscrire mon entreprise <Arrow /></a>
          </div>
          <div className={`au-welcome au-w-signup${welcome === "signup" ? "" : " au-off"}`} aria-hidden={welcome !== "signup"}>
            <Brand />
            <span className="au-kicker">Essai gratuit · {trialDays} jours</span>
            <h2>Votre parc, <em>sans tableur.</em></h2>
            <p>Testez toutes les fonctionnalités sur votre propre parc. Vos données restent à vous.</p>
            <a className="au-ghost" href="/login" data-au-go="login" tabIndex={welcome === "signup" ? 0 : -1}><Arrow back /> J&apos;ai déjà un compte</a>
          </div>
          <Image className={`au-cover${cover ? " au-on" : ""}`} src="/vitrine/logo-mark-clair.webp" width={107} height={96} alt="" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// Textes du volet fixe pour les autres étapes du parcours.
const STEPS: Record<string, { k: string; t: string; em: string; d: string }> = {
  "/forgot-password": { k: "Accès", t: "Mot de passe", em: "oublié ?", d: "Recevez un lien de réinitialisation par e-mail pour choisir un nouveau mot de passe." },
  "/set-password": { k: "Accès", t: "Nouveau", em: "mot de passe.", d: "12 caractères minimum, avec une majuscule, une minuscule et un chiffre." },
  "/mfa": { k: "Sécurité", t: "Vérification en", em: "deux étapes.", d: "Un second code protège vos données et vos preuves d'audit." },
  "/onboarding": { k: "Dernière étape", t: "Votre", em: "entreprise.", d: "Ces informations apparaissent sur vos fiches et vos exports. Vous pourrez les modifier plus tard." },
  "/suspendu": { k: "Compte", t: "Accès", em: "suspendu.", d: "Vos données sont conservées." },
};

/** Carte à volet fixe ; laisse passer telles quelles les pages qui gèrent leur propre carte (/login, /register). */
export function AuthFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const band = useRef<HTMLDivElement>(null);
  const seam = useRef<HTMLDivElement>(null);
  useShape(band, seam, "login");
  if (path === "/login" || path === "/register") return <>{children}</>;
  const s = STEPS[path] ?? { k: "DIOMETRO", t: "Suivi", em: "métrologique.", d: "Vos instruments, leurs étalonnages et leurs échéances au même endroit." };
  return (
    <div className="au-inner">
      <div className="au-top"><Link className="au-home" href="/">← Accueil</Link></div>
      <div className="au-card au-static">
        <section className="au-pane">{children}</section>
        <div className="au-seam" ref={seam} aria-hidden="true" style={{ clipPath: poly(WIDE.login, 0.7) }} />
        <div className="au-band" ref={band} style={{ clipPath: poly(WIDE.login) }}>
          <div className="au-welcome au-w-login">
            <Brand />
            <span className="au-kicker">{s.k}</span>
            <h2>{s.t} <em>{s.em}</em></h2>
            <p>{s.d}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
