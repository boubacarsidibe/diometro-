import { redirect } from "next/navigation";
import { PrestataireForm } from "@/components/PrestataireForm";
import { Topbar } from "@/components/Topbar";
import { canEdit, requireSession } from "@/lib/session";
import { createPrestataire } from "../actions";

export default async function NewPrestatairePage() {
  const s = await requireSession();
  if (!canEdit(s)) redirect("/prestataires");
  return (
    <>
      <Topbar title="Nouveau prestataire" subtitle="Renseignez la fiche du prestataire." />
      <div className="content"><div className="card"><PrestataireForm action={createPrestataire} submit="Créer le prestataire" accreditation={s.tenant.accreditation_label} defaultCurrency={s.tenant.currency} /></div></div>
    </>
  );
}
