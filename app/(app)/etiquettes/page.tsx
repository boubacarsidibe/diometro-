import { headers } from "next/headers";
import { LabelPrinter, type LabelItem } from "@/components/LabelPrinter";
import { Topbar } from "@/components/Topbar";
import { qrDataUri } from "@/lib/qr";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Instrument } from "@/lib/types";

const MAX = 150;

export default async function EtiquettesPage() {
  await requireSession();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;
  const supabase = await createClient();
  const { data } = await supabase.from("instruments").select("id, ref, designation, batiment, zone").is("deleted_at", null).order("ref").limit(MAX);
  const list = (data ?? []) as Pick<Instrument, "id" | "ref" | "designation" | "batiment" | "zone">[];
  const items: LabelItem[] = await Promise.all(
    list.map(async (i) => ({ id: i.id, ref: i.ref, designation: i.designation, location: [i.batiment, i.zone].filter(Boolean).join(" · "), qr: await qrDataUri(`${origin}/instruments/${i.id}`) })),
  );
  return (
    <>
      <Topbar title="QR codes et étiquettes" subtitle="Scannez le QR code pour ouvrir la fiche de l'instrument (connexion requise)." />
      <div className="content">
        {items.length === 0 ? <div className="card empty">Aucun instrument à étiqueter.</div> : <LabelPrinter items={items} />}
      </div>
    </>
  );
}
