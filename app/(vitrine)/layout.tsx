import { publicFonts } from "@/lib/fonts";
import "./vitrine.css";

// Mise en page propre à la page d'accueil : son en-tête et son pied de page sont dans la page elle-même.
// Les pages légales gardent la mise en page du groupe (public).
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return <div className={`vt ${publicFonts}`}>{children}</div>;
}
