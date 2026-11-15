import { deleteAttachment } from "@/app/(app)/instruments/attachments";
import { ConfirmAction } from "@/components/ConfirmAction";
import type { Attachment } from "@/lib/types";
import { fmtDate } from "@/lib/dates";

const KIND_LABEL: Record<string, string> = { certificat: "Certificat", fiche_de_vie: "Fiche de vie", procedure: "Procédure", photo: "Photo", autre: "Autre" };
const PREVIEW = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export function AttachmentList({ items, instrumentId, canDelete, timeZone }: { items: Attachment[]; instrumentId: string; canDelete: boolean; timeZone?: string }) {
  if (items.length === 0) return <div className="empty">Aucun document joint.</div>;
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Type</th><th>Fichier</th><th>Taille</th><th>Ajouté le</th><th /></tr></thead>
      <tbody>{items.map((a) => (
        <tr key={a.id}>
          <td><span className="tag">{KIND_LABEL[a.kind] ?? a.kind}</span></td>
          <td><a href={`/api/attachments/${a.id}`}>{a.filename}</a>{PREVIEW.has(a.mime) && <> · <a href={`/api/attachments/${a.id}/view`} target="_blank" rel="noopener noreferrer">Aperçu</a></>}</td>
          <td>{size(a.size_bytes)}</td><td>{fmtDate(a.created_at, "—", timeZone)}</td>
          <td>{canDelete && <ConfirmAction action={deleteAttachment.bind(null, a.id, instrumentId)} label="Supprimer" confirmLabel="Oui, supprimer"
            message={`Supprimer définitivement « ${a.filename} » ? Le fichier ne pourra pas être récupéré.`} />}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}
