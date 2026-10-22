import { computeDirect, type DirectInput } from "@/lib/calc/direct";
import { fmt } from "@/lib/calc/parse";
import { computePipette, type PipetteInput } from "@/lib/calc/pipette";
import { computePt100, type Pt100Input } from "@/lib/calc/pt100";
import { pipetteSchema, pt100Schema, directSchema } from "@/lib/calc/schemas";

// Détail d'un calcul enregistré : on re-calcule à partir des saisies stockées (jamais de HTML stocké).
export function CalculDetail({ kind, data }: { kind: string; data: unknown }) {
  const input = (data as { input?: unknown } | null)?.input;
  const row = (l: string, v: string) => <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5, padding: "2px 0" }}><span style={{ color: "var(--muted)" }}>{l}</span><span>{v}</span></div>;
  if (kind === "pipette") {
    const p = pipetteSchema.safeParse(input);
    const r = p.success ? computePipette(p.data as PipetteInput) : null;
    if (!r) return null;
    return <details><summary>Voir le détail du calcul</summary>{[row("V20", `${fmt(r.V20, 4)} mL`), row("U (k=2)", `± ${fmt(r.UV20 * 1000, 2)} µL`), row("Justesse", `${fmt(r.errPct, 3)} %`), row("Fidélité (CV)", `${fmt(r.cvPct, 3)} %`), row("ρ eau", `${fmt(r.rhoE, 6)} g/cm³`), row("Z", fmt(r.Z, 6)), row("Y", fmt(r.Y, 7))]}</details>;
  }
  if (kind === "pt100") {
    const p = pt100Schema.safeParse(input);
    const r = p.success ? computePt100(p.data as Pt100Input) : null;
    if (!r) return null;
    return <details><summary>Voir le détail du calcul</summary>{r.points.map((pt) => row(`Point ${pt.cons ?? pt.index + 1} °C`, `erreur ${fmt(pt.erreur, 3)} · U ± ${fmt(pt.U, 3)} · ${pt.verdict === "ok" ? "conforme" : pt.verdict === "no" ? "non conforme" : "douteux"}`))}</details>;
  }
  if (kind === "direct") {
    const p = directSchema.safeParse(input);
    const r = p.success ? computeDirect(p.data as DirectInput) : null;
    if (!r) return null;
    return <details><summary>Voir le détail du calcul</summary>{r.points.map((pt) => row(`Point ${pt.index + 1} (étalon ${fmt(pt.ref)})`, `lue ${fmt(pt.lue)} · écart ${pt.erreur >= 0 ? "+" : ""}${fmt(pt.erreur)}`))}</details>;
  }
  return null;
}
