import { useState } from "react";
import { FileText, Search, Download } from "lucide-react";
import { C } from "@/lib/theme";
import { Pill, priorityTone, EmptyState } from "./components/UI";
import { useReceivedDocuments, useUpdateReceivedDocument, useMe } from "@/hooks/use-workspace";
import { openSigned, errMsg } from "../shared/signed";
import { format } from "date-fns";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function Inbox() {
  const { w, dateLocale, locale, lang } = useWorkspaceLocale();
  const { data: docs, isLoading, isError, error: loadError, refetch } = useReceivedDocuments();
  const updateDoc = useUpdateReceivedDocument();
  const me = useMe();
  const [search, setSearch] = useState("");
  const canDownload = me.data?.permissions?.includes("DOWNLOAD_ALLOWED_DOCUMENTS");
  const canSubmit = me.data?.permissions?.includes("SUBMIT_DOCUMENTS");
  const filtered = (docs || []).filter((d: any) => [d.document.title, d.document.manualContent, d.document.fileName, d.assignment.instruction].some(v => String(v || "").toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale))));
  const [dlError, setDlError] = useState<string | null>(null);

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

      <p className="text-sm" style={{ color: C.inkSoft }}>{w("Les documents rédigés et les fichiers joints par l’Admin pour votre compte arrivent ici. Le texte est lisible directement ; les pièces jointes s’ouvrent avec un lien privé temporaire.", "Documents and attachments shared by your administrator appear here. Text can be read directly; attachments open through a temporary private link.")}</p>
      {isError && <p className="text-sm text-red-600" role="alert">{loadError instanceof Error ? localizeApiMessage(loadError.message, lang) : w("Impossible de charger les documents.", "Unable to load documents.")} <button className="underline" onClick={() => refetch()}>{w("Réessayer", "Try again")}</button></p>}
      {updateDoc.isError && <p className="text-sm text-red-600" role="alert">{updateDoc.error instanceof Error ? localizeApiMessage(updateDoc.error.message, lang) : w("La mise à jour du statut a échoué. Réessayez.", "The status update failed. Please try again.")}</p>}
      {dlError && <p className="text-sm text-red-600" role="alert">{dlError === "download-error" ? w("Téléchargement impossible.", "Download failed.") : localizeApiMessage(dlError, lang)}</p>}
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
                      {d.document.assetId && canDownload && (
                        <button type="button" className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium hover:underline" style={{ color: C.copper }}
                          onClick={() => { setDlError(null); openSigned(`/workspace/documents/received/${d.assignment.id}/file`).catch((e) => setDlError(errMsg(e, "download-error"))); }} data-testid={`button-download-${d.assignment.id}`}>
                          <Download size={14} /> {w("Télécharger l’original", "Download original")}{d.document.fileName ? ` (${d.document.fileName})` : ""}
                        </button>
                      )}
                      {d.document.assetId && !canDownload && <p className="mt-2 text-xs" style={{ color: C.inkSoft }}>{w("Une pièce jointe est disponible. Demandez à la Direction la permission de téléchargement.", "An attachment is available. Ask Management for download permission.")}</p>}
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
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canSubmit && d.assignment.status !== "completed" && (
                        <button
                          disabled={updateDoc.isPending}
                          onClick={() => updateDoc.mutate({ id: d.assignment.id, data: { status: "completed" } })}
                          className="text-sm font-medium hover:underline"
                          style={{ color: C.copper }}
                        >
                          {w("Marquer traité", "Mark as completed")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
    completed: ["Terminé", "Completed"], pending: ["En attente", "Pending"],
    in_progress: ["En cours", "In progress"], submitted: ["Soumis", "Submitted"],
    accepted: ["Accepté", "Accepted"], new: ["Nouveau", "New"],
    revision_required: ["Révision requise", "Revision required"],
  };
  const label = labels[status];
  return label ? w(...label) : status;
}
