import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// Polices du site public (vitrine et pages de connexion), hébergées par Next au build : compatibles avec la CSP (font-src 'self').
// Archivo est chargée avec son axe de largeur (wdth) pour les titres légèrement élargis.
export const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], style: ["normal", "italic"], display: "swap", variable: "--font-archivo" });
export const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-plex-sans" });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex-mono" });
export const publicFonts = `${archivo.variable} ${plexSans.variable} ${plexMono.variable}`;
