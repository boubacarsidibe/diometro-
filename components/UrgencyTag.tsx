import { URGENCY_LABEL, type Urgency } from "@/lib/status";

const COLOR: Record<Urgency, string> = { expire: "red", urgent: "orange", bientot: "yellow", ok: "green", none: "" };

export function UrgencyTag({ urgency, statut }: { urgency: Urgency; statut?: string | null }) {
  if (statut === "Réformé") return <span className="tag">Mis au rebut</span>;
  return <span className={`tag ${COLOR[urgency]}`}>{URGENCY_LABEL[urgency]}</span>;
}

export const rowClass = (u: Urgency) => (u === "expire" ? "row-red" : u === "urgent" ? "row-orange" : u === "bientot" ? "row-yellow" : "");
