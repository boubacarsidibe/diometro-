import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" style={{ fontSize: 22, textDecoration: "none" }}>DIO<span>METRO</span></Link>
      <nav aria-label="Navigation du site">
        <Link href="/#fonctionnalites">Fonctionnalités</Link>
        <Link href="/#formules">Formules</Link>
        <Link href="/login">Connexion</Link>
        <Link href="/register" className="btn small primary">Essai gratuit</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>© {new Date().getFullYear()} DIOMETRO — Suivi métrologique</div>
      <nav aria-label="Informations légales">
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgu">Conditions générales d&apos;utilisation</Link>
        <Link href="/confidentialite">Politique de confidentialité</Link>
      </nav>
    </footer>
  );
}

export function Missing({ children }: { children?: string }) {
  return <mark className="todo">[à compléter{children ? ` : ${children}` : ""}]</mark>;
}
