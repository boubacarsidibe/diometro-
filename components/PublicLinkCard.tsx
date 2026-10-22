"use client";
import { useState, useTransition } from "react";
import { setPublicLink } from "@/app/(app)/instruments/public-link";

export function PublicLinkCard({ instrumentId, url, qr }: { instrumentId: string; url: string | null; qr: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const toggle = (enabled: boolean) => start(async () => { setError(undefined); const r = await setPublicLink(instrumentId, enabled); if (!r.ok) setError("Action impossible."); });
  async function copy() { if (url) { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } }
  return (
    <div>
      <p className="helper" style={{ marginBottom: 10 }}>Un lien public permet à toute personne qui scanne le QR code de voir, <strong>sans connexion</strong>, uniquement : référence, désignation, type, statut, conformité et dates d&apos;étalonnage. Aucun commentaire, document ni lieu. Désactivé par défaut ; la désactivation coupe le lien immédiatement.</p>
      {error && <div className="notice err" role="alert">{error}</div>}
      {url ? (
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="QR code du lien public" width={110} height={110} />}
          <div style={{ flex: 1, minWidth: 240 }}>
            <input className="input" readOnly value={url} aria-label="Lien public" onFocus={(e) => e.currentTarget.select()} />
            <div className="form-actions"><button type="button" className="btn small soft" onClick={copy}>{copied ? "Copié ✓" : "Copier le lien"}</button><button type="button" className="btn small danger" disabled={pending} onClick={() => toggle(false)}>Désactiver le lien</button></div>
          </div>
        </div>
      ) : (
        <button type="button" className="btn small primary" disabled={pending} onClick={() => toggle(true)}>{pending ? "Activation…" : "Activer le lien public"}</button>
      )}
    </div>
  );
}
