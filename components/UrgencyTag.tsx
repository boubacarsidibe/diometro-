import { URGENCY_LABEL, type Urgency } from "@/lib/status";

const COLOR: Record<Urgency, string> = { expire: "red", urgent: "orange", bientot: "yellow", ok: "green", none: "" };

export function UrgencyTag({ urgency }: { urgency: Urgency }) {
  return <span className={`tag ${COLOR[urgency]}`}>{URGENCY_LABEL[urgency]}</span>;
}

export const rowClass = (u: Urgency) => (u === "expire" ? "row-red" : u === "urgent" ? "row-orange" : u === "bientot" ? "row-yellow" : "");
