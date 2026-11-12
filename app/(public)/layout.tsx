import { IBM_Plex_Sans } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/LegalLayout";

// Police du site public (accueil et pages légales), hébergée par Next au build : compatible avec la CSP (font-src 'self').
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${plex.className}`}>
      <SiteHeader />
      <main className="site-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
