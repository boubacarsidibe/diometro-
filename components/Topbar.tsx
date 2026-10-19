export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <h1 className="top-title">{title}</h1>
        {subtitle && <div className="top-meta">{subtitle}</div>}
      </div>
      {actions && <div className="top-actions">{actions}</div>}
    </header>
  );
}
