import type { Session } from "@/lib/session";

export function ConsoleHeader({ s, title, sub, children }: { s: Session; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="cs-top">
      <div className="cs-grow"><h1>{title}</h1>{sub && <div className="cs-muted">{sub}</div>}</div>
      {children}
      <div className="cs-me"><div className="cs-av" aria-hidden="true">{s.displayName.slice(0, 2).toUpperCase()}</div><div><b>{s.displayName}</b><small>Admin plateforme</small></div></div>
    </header>
  );
}
