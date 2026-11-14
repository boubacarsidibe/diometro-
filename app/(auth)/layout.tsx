import { AuthFrame } from "@/components/auth/AuthCards";
import { publicFonts } from "@/lib/fonts";
import "./auth.css";

// Pages de connexion : fond sauge quadrillé et carte à volet (voir components/auth/AuthCards.tsx).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={`au ${publicFonts}`}>
      <AuthFrame>{children}</AuthFrame>
    </main>
  );
}
