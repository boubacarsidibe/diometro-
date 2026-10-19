import type { Metadata } from "next";
import "./globals.css";

// Rendu dynamique partout : la CSP utilise un nonce par requête (voir proxy.ts).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DIOMETRO · Suivi métrologique",
  description: "Gestion et suivi métrologique des instruments de mesure.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
