import { BackButton } from "@/components/BackButton";

export function Topbar({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: React.ReactNode; back?: string }) {
  return (
    <header className="topbar">
      <div className="top-left">
        <BackButton fallback={back} />
        <div>
          <h1 className="top-title">{title}</h1>
          {subtitle && <div className="top-meta">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="top-actions">{actions}</div>}
    </header>
  );
}
