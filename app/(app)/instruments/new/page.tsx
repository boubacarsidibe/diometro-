import { redirect } from "next/navigation";
import { NewInstrument } from "@/components/NewInstrument";
import { Topbar } from "@/components/Topbar";
import { canEdit, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createInstrument } from "../actions";

export default async function NewInstrumentPage() {
  const s = await requireSession();
  if (!canEdit(s)) redirect("/instruments");
  const supabase = await createClient();
  const { data: prest } = await supabase.from("prestataires").select("id, nom").is("deleted_at", null).eq("actif", true).order("nom");
  return (
    <>
      <Topbar title="Nouvel instrument" subtitle="Renseignez la fiche de l'instrument." />
      <div className="content"><div className="card"><NewInstrument action={createInstrument} buildings={s.tenant.buildings} prestataires={prest ?? []} /></div></div>
    </>
  );
}
