import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, EmptyState } from "./components/UI";
import { useReceivedDocuments, useUpdateReceivedDocument, useMe } from "@/hooks/use-workspace";
import { DocOpenButton } from "./components/DocOpen";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";
import ReturnDocumentDialog from "./components/ReturnDocumentDialog";

export default function Inbox() {
  const { w, dateLocale, locale, lang, formatDateTime: localDateTime } = useWorkspaceLocale();
  const { data: docs, isLoading, isError, error: loadError, refetch } = useReceivedDocuments();
  const updateDoc = useUpdateReceivedDocument();
  const me = useMe();
  const [search, setSearch] = useState("");
  const [returning, setReturning] = useState<any | null>(null);
  const [sent, setSent] = useState(false);
  const canSubmit = me.data?.permissions?.includes("SUBMIT_DOCUMENTS");
  const canReturn = canSubmit && me.data?.permissions?.includes("UPLOAD_DOCUMENTS")
    && me.data?.permissions?.includes("workspace:write");
  const filtered = (docs || []).filter((d: any) => [d.document.title, d.document.manualContent, d.document.fileName, d.assignment.instruction].some(v => String(v || "").toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))));

  if (isLoading) return <div className="p-8 flex justify-center">{w("Chargement...", "Loading...")}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold" style={{ color: C.ink }}>{w("Documents reçus de la Direction", "Documents received from Management")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={w("Rechercher...", "Search...")}
              aria-label={w("Rechercher dans les documents reçus", "Search received documents")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-md w-full md:w-64"
              style={{ border: `1px solid ${C.line}`, background: "white" }}
            />
          </div>
        </div>
      </div>

      {isError && <p className="text-sm text-red-600" role="alert">{loadError instanceof Error ? localizeApiMessage(loadError.message, lang) : w("Impossible de charger les documents.", "Unable to load documents.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p>}
      {updateDoc.isError && <p className="text-sm text-red-600" role="alert">{updateDoc.error instanceof Error ? localizeApiMessage(updateDoc.error.message, lang) : w("La mise à jour du statut a échoué. Réessayez.", "The status update failed. Please try again.")}</p>}
      <p className="text-sm" style={{ color: C.inkSoft }} data-testid="text-document-status-explanation">
        {w("« Marquer traité » change uniquement le statut. Pour transmettre le fichier complété ou signé à la Direction, utilisez « Renvoyer le document traité ».", "“Mark as processed” only changes the status. Use “Return the processed document” to send the completed or signed file to Management.")}
      </p>
      {sent && <p role="status" className="rounded-md p-3 text-sm" style={{ background: C.greenBg, color: C.green }} data-testid="status-document-return-sent">
        {w("Le document a été renvoyé. La Direction a été notifiée et l’original est conservé.", "The document has been returned. Management has been notified and the original preserved.")}
      </p>}
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={{ background: C.bg, borderBottom: `1px solid ${C.line}`, color: C.inkSoft }}>
              <tr>
                <th className="px-5 py-3 font-medium">{w("Document & instruction", "Document & instructions")}</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">{w("Échéance", "Due date")}</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">{w("Priorité", "Priority")}</th>
                <th className="px-5 py-3 font-medium">{w("Statut", "Status")}</th>
                <th className="px-5 py-3 font-medium text-right">{w("Action", "Action")}</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState icon={FileText} text={isError ? w("Documents indisponibles.", "Documents unavailable.") : search ? w("Aucun document ne correspond à votre recherche.", "No documents match your search.") : w("Aucun document reçu pour le moment.", "No documents received yet.")} />
                  </td>
                </tr>
              ) : (
                filtered.map((d: any) => (
                  <tr key={d.assignment.id} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className="px-5 py-4 min-w-[250px]">
                      <p className="font-medium" style={{ color: C.ink }}>{d.document.title}</p>
                      <p className="text-[12.5px] mt-1" style={{ color: C.inkSoft }}>{d.assignment.instruction || w("Aucune instruction", "No instructions")}</p>
                      {d.document.manualContent && <div className="mt-2 p-3 rounded-md text-[13px] whitespace-pre-wrap break-words" style={{ background: C.bg, color: C.ink }} data-testid={`text-manual-${d.assignment.id}`}>{d.document.manualContent}</div>}
                      <DocOpenButton doc={{ ...d.document, downloadPath: d.document.downloadPath ?? `/workspace/documents/received/${d.assignment.id}/file` }} testId={`button-download-${d.assignment.id}`} />
                      {d.returns?.length > 0 && <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium" style={{ color: C.green }} data-testid={`button-return-history-${d.assignment.id}`}>
                          {w("Dernier retour :", "Last return:")} {localDateTime(d.returns[0].submittedAt)} · {w("Voir les retours", "View returns")}
                        </summary>
                        <div className="mt-2 space-y-3">{d.returns.map((returned: any) => <div key={returned.id} className="rounded-md p-3" style={{ background: C.bg }} data-testid={`document-return-${returned.id}`}>
                          <p className="text-xs font-medium">{w("Retourné le", "Returned on")} {localDateTime(returned.submittedAt)}</p>
                          {returned.comment && <p className="mt-1 text-xs whitespace-pre-wrap break-words">{returned.comment}</p>}
                          <DocOpenButton doc={returned} testId={`button-download-return-${returned.id}`} />
                        </div>)}</div>
                      </details>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell" style={{ color: C.inkSoft }}>
                      {d.assignment.dueAt ? format(new Date(d.assignment.dueAt), "dd MMM yyyy", { locale: dateLocale }) : "—"}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Pill tone={priorityTone(d.assignment.priority || "normal")}>{priorityLabel(d.assignment.priority || "normal", w)}</Pill>
                    </td>
                    <td className="px-5 py-4">
                      <Pill tone={d.assignment.status === "completed" ? "basse" : "moyenne"}>
                        {statusLabel(d.assignment.status, w)}
                      </Pill>
                      {!d.returns?.length && <p className="text-xs mt-2" style={{ color: C.inkSoft }} data-testid={`text-no-return-${d.assignment.id}`}>{w("Aucun fichier retourné", "No file returned")}</p>}
                    </td>
                    <td className="px-5 py-4 text-right">
                       <div className="flex flex-col items-end gap-3">
                       {canReturn && <button type="button" className="rounded-md px-3 py-2 text-xs font-medium text-white"
                         style={{ background: C.navy }} onClick={() => { setSent(false); setReturning(d); }}
                         data-testid={`button-return-document-${d.assignment.id}`}>
                         {w("Renvoyer le document traité", "Return the processed document")}
                       </button>}
                       {canSubmit && d.assignment.status !== "completed" && (
                        <button
                           type="button"
                           data-testid={`button-mark-document-processed-${d.assignment.id}`}
                          disabled={updateDoc.isPending}
                          onClick={() => updateDoc.mutate({ id: d.assignment.id, data: { status: "completed" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          {w("Marquer traité", "Mark as completed")}
                        </button>
                      )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {returning && <ReturnDocumentDialog document={returning} onClose={() => setReturning(null)} onSent={() => setSent(true)} />}
    </div>
  );
}

function priorityLabel(priority: string, w: (french: string, english: string) => string) {
  const labels: Record<string, [string, string]> = {
    urgent: ["Urgente", "Urgent"], Urgent: ["Urgente", "Urgent"], high: ["Haute", "High"], High: ["Haute", "High"], Haute: ["Haute", "High"],
    normal: ["Normale", "Normal"], Normal: ["Normale", "Normal"], medium: ["Moyenne", "Medium"], Medium: ["Moyenne", "Medium"], Moyenne: ["Moyenne", "Medium"],
    low: ["Basse", "Low"], Low: ["Basse", "Low"], Basse: ["Basse", "Low"],
  };
  const label = labels[priority];
  return label ? w(...label) : priority;
}

function statusLabel(status: string, w: (french: string, english: string) => string) {
  const labels: Record<string, [string, string]> = {
    completed: ["Traité", "Processed"], pending: ["En attente", "Pending"], received: ["Reçu", "Received"],
    in_progress: ["En cours", "In progress"], submitted: ["Réponse envoyée", "Response sent"],
    accepted: ["Accepté", "Accepted"], new: ["Nouveau", "New"],
    revision_required: ["Révision requise", "Revision required"],
  };
  const label = labels[status];
  return label ? w(...label) : status;
}
