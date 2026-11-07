import { appOrigin } from "@/lib/origin";
import { LabelPrinter, type LabelItem } from "@/components/LabelPrinter";
import { Topbar } from "@/components/Topbar";
import { qrDataUri } from "@/lib/qr";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Instrument } from "@/lib/types";

const MAX = 150;

export default async function EtiquettesPage() {
  await requireSession();
  const origin = await appOrigin();
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("id, ref, designation, batiment, zone, public_token").is("deleted_at", null).order("ref").limit(MAX);
  const list = (data ?? []) as Pick<Instrument, "id" | "ref" | "designation" | "batiment" | "zone" | "public_token">[];
  const items: LabelItem[] = await Promise.all(
    list.map(async (i) => ({ id: i.id, ref: i.ref, designation: i.designation, location: [i.batiment, i.zone].filter(Boolean).join(" · "), qr: i.public_token ? await qrDataUri(`${origin}/p/${i.public_token}`) : null })),
  );
  return (
    <>
      <Topbar title="QR codes et étiquettes" subtitle="Le QR code ouvre la fiche publique de l'instrument, sans connexion, toujours à jour." />
      <div className="content">
        {items.length === 0 ? <div className="card empty">Aucun instrument à étiqueter.</div> : <LabelPrinter items={items} />}
      </div>
    </>
  );
}
