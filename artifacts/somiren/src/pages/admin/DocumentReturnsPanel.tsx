import { useListDocumentReturns, getListDocumentReturnsQueryKey } from "@workspace/api-client-react";
import { DocOpenButton } from "../workspace/components/DocOpen";
import { C, SectionCard } from "./shared";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export default function DocumentReturnsPanel() {
  const { w, lang, formatDateTime: localDateTime } = useWorkspaceLocale();
  const query = useListDocumentReturns({
    query: { queryKey: getListDocumentReturnsQueryKey(), refetchInterval: 30000 },
    request: { credentials: "include" },
  });
  return <SectionCard title={w("Documents retournés à la Direction", "Documents returned to Management")}>
    {query.isLoading ? <p className="text-sm">{w("Chargement…", "Loading…")}</p>
      : query.isError ? <p role="alert" className="text-sm text-red-600">
        {localizeApiMessage(query.error.message, lang)}
        <button type="button" onClick={() => query.refetch()} className="ml-2 underline" data-testid="button-retry-document-returns">{w("Réessayer", "Try again")}</button>
      </p>
      : !query.data?.returns.length ? <p className="text-sm" style={{ color: C.inkSoft }}>{w("Aucun fichier retourné pour le moment.", "No files returned yet.")}</p>
      : <div className="space-y-4">{query.data.returns.map(returned => <article key={returned.id}
        className="rounded-md border p-4" data-testid={`card-admin-document-return-${returned.id}`}>
        <h3 className="font-semibold text-sm">{returned.documentTitle}</h3>
        <p className="text-xs mt-1" style={{ color: C.inkSoft }}>{returned.collaboratorName} · {w("Retourné le", "Returned on")} {localDateTime(returned.submittedAt)}</p>
        {returned.comment && <p className="mt-3 text-sm whitespace-pre-wrap break-words">{returned.comment}</p>}
        <div className="mt-2">
          <p className="text-xs font-semibold">{w("Document traité", "Processed document")}</p>
          <DocOpenButton doc={returned} testId={`button-admin-download-return-${returned.id}`} />
        </div>
        <details className="mt-3">
          <summary className="text-xs cursor-pointer" data-testid={`button-admin-original-${returned.id}`}>{w("Consulter l’original conservé", "View the preserved original")}</summary>
          {returned.originalDocument.manualContent && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{returned.originalDocument.manualContent}</p>}
          <DocOpenButton doc={returned.originalDocument} testId={`button-admin-original-file-${returned.id}`} />
        </details>
      </article>)}</div>}
  </SectionCard>;
}