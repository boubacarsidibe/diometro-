import type { Metadata } from "next";
import "./globals.css";

// Rendu dynamique partout : la CSP utilise un nonce par requête (voir proxy.ts).
export const dynamic = "force-dynamic";

// Par défaut, rien n'est indexé par Google (espace connecté, fiches QR…). Seules les pages publiques
// (accueil, inscription, connexion, pages légales) l'autorisent explicitement (voir lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://diometro.vercel.app"),
  title: "DIOMETRO · Suivi métrologique",
  description: "Gestion et suivi métrologique des instruments de mesure.",
  robots: { index: false, follow: false },
  // Code de vérification Google Search Console (balise meta), à renseigner dans Vercel : GOOGLE_SITE_VERIFICATION.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
