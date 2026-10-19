export function Field({
  label, name, error, full, children,
}: { label: string; name: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

export function Notice({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <div className="notice err" role="alert">{error}</div>;
  if (ok) return <div className="notice ok" role="status">{ok}</div>;
  return null;
}
