import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./vitrine.css";

// Polices du site vitrine, hébergées par Next au build : compatibles avec la CSP (font-src 'self').
// Archivo est chargée avec son axe de largeur (wdth) pour les titres légèrement élargis.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap", variable: "--font-archivo" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex-mono" });

// Mise en page propre à la page d'accueil : son en-tête et son pied de page sont dans la page elle-même.
// Les pages légales gardent la mise en page du groupe (public).
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return <div className={`vt ${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>{children}</div>;
}
