import { redirect } from "next/navigation";
import { InstrumentForm } from "@/components/InstrumentForm";
import { Topbar } from "@/components/Topbar";
import { canWrite, requireSession } from "@/lib/session";
import { createInstrument } from "../actions";

export default async function NewInstrumentPage() {
  const s = await requireSession();
  if (!canWrite(s.role)) redirect("/instruments");
  return (
    <>
      <Topbar title="Nouvel instrument" subtitle="Renseignez la fiche de l'instrument." />
      <div className="content"><div className="card"><InstrumentForm action={createInstrument} submit="Créer l'instrument" /></div></div>
    </>
  );
}
