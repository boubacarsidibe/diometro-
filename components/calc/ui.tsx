"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCalculation } from "@/app/(app)/instruments/[id]/etalonnage/actions";
import { VERDICT_LABEL } from "@/lib/calc/describe";
import type { Verdict } from "@/lib/calc/pt100";

export function NumField({ label, value, onChange, unit, id }: { label: string; value: string; onChange: (v: string) => void; unit?: string; id: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{unit ? ` (${unit})` : ""}</label>
      <input id={id} className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cls = verdict === "ok" ? "green" : verdict === "doubt" ? "yellow" : "red";
  return <span className={`tag ${cls}`} style={{ fontSize: 13, padding: "5px 12px" }}>{verdict === "ok" ? "✓ " : verdict === "no" ? "✗ " : "⚠ "}{VERDICT_LABEL[verdict]}</span>;
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderBottom: "1px solid var(--line)", fontWeight: strong ? 800 : 500, fontSize: 13.5 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span><span>{value}</span>
    </div>
  );
}

export function SaveBar({ instrumentId, kind, payload, disabled }: { instrumentId: string; kind: string; payload: unknown; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  function save() {
    setMsg(undefined);
    start(async () => {
      const res = await saveCalculation(instrumentId, kind, payload);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Enregistré dans la fiche de vie. Conformité et échéance mises à jour." });
      router.refresh();
    });
  }
  return (
    <div style={{ marginTop: 14 }}>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</div>}
      <button type="button" className="btn primary" onClick={save} disabled={disabled || pending}>{pending ? "Enregistrement…" : "Enregistrer comme intervention"}</button>
    </div>
  );
}

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);
