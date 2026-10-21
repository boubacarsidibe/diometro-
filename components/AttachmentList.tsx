import { deleteAttachment } from "@/app/(app)/instruments/attachments";
import type { Attachment } from "@/lib/types";

const KIND_LABEL: Record<string, string> = { certificat: "Certificat", fiche_de_vie: "Fiche de vie", procedure: "Procédure", photo: "Photo", autre: "Autre" };
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export function AttachmentList({ items, instrumentId, canDelete }: { items: Attachment[]; instrumentId: string; canDelete: boolean }) {
  if (items.length === 0) return <div className="empty">Aucun document joint.</div>;
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>Type</th><th>Fichier</th><th>Taille</th><th>Ajouté le</th><th /></tr></thead>
      <tbody>{items.map((a) => (
        <tr key={a.id}>
          <td><span className="tag">{KIND_LABEL[a.kind] ?? a.kind}</span></td>
          <td><a href={`/api/attachments/${a.id}`}>{a.filename}</a></td>
          <td>{size(a.size_bytes)}</td><td>{new Date(a.created_at).toLocaleDateString("fr-FR")}</td>
          <td>{canDelete && <form action={deleteAttachment.bind(null, a.id, instrumentId)}><button className="btn small soft">Supprimer</button></form>}</td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}
