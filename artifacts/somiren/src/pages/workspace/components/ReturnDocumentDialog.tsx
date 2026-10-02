import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useReturnReceivedDocument, getListDocumentReturnsQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { uploadPrivateFile } from "@/lib/private-media";
import { localizeApiMessage } from "@/i18n/api-error-translations";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { MAX_DOC_BYTES } from "@/types/media";
import { C } from "@/lib/theme";

const schema = z.object({ comment: z.string().max(2000) });

export default function ReturnDocumentDialog({ document, onClose, onSent }: {
  document: any; onClose: () => void; onSent: () => void;
}) {
  const { w, lang } = useWorkspaceLocale();
  const cache = useQueryClient();
  const submit = useReturnReceivedDocument({ request: { credentials: "include" } });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { comment: "" } });
  const [file, setFile] = useState<File | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"uploading" | "sending">("uploading");
  const [error, setError] = useState<string | null>(null);

  async function send(values: z.infer<typeof schema>) {
    if (!file) { setError(w("Joignez le document complété ou signé.", "Attach the completed or signed document.")); return; }
    setBusy(true); setError(null);
    try {
      setStage("uploading");
      // Keep a completed upload for retry if only the submission request fails.
      const uploadedAssetId = assetId ?? await uploadPrivateFile(file, "document", file.name);
      setAssetId(uploadedAssetId);
      setStage("sending");
      await submit.mutateAsync({ id: document.assignment.id, data: {
        assetId: uploadedAssetId, ...(values.comment.trim() ? { comment: values.comment.trim() } : {}),
      } });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["workspace", "documents"] }),
        cache.invalidateQueries({ queryKey: ["workspace", "dashboard"] }),
        cache.invalidateQueries({ queryKey: ["workspace", "notifications"] }),
        cache.invalidateQueries({ queryKey: getListDocumentReturnsQueryKey() }),
      ]);
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? localizeApiMessage(err.message, lang)
        : w("Le document n’a pas été envoyé. Réessayez.", "The document was not sent. Please try again."));
    } finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="sm:max-w-lg" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => { if (busy) event.preventDefault(); }} data-testid="dialog-return-document">
      <DialogHeader>
        <DialogTitle>{w("Renvoyer le document traité", "Return the processed document")}</DialogTitle>
        <DialogDescription>{document.document.title} — {w("L’original sera conservé. La Direction sera notifiée après l’envoi.", "The original will be preserved. Management will be notified after submission.")}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(send)} className="space-y-4">
          <div>
            <label htmlFor="return-document-file" className="block text-sm font-medium mb-2">{w("Document complété ou signé *", "Completed or signed document *")}</label>
            <input id="return-document-file" type="file" disabled={busy} data-testid="input-return-document-file"
              className="block w-full text-sm"
              onChange={event => {
                const selected = event.target.files?.[0] ?? null;
                setAssetId(null); setError(null);
                if (selected && (selected.size === 0 || selected.size > MAX_DOC_BYTES)) {
                  setFile(null); event.target.value = "";
                  setError(w("Choisissez un fichier non vide de 20 Mo maximum.", "Choose a non-empty file of up to 20 MB."));
                  return;
                }
                setFile(selected);
              }} />
            <p className="mt-2 text-xs" style={{ color: C.inkSoft }}>{w("20 Mo maximum. Le fichier envoyé ne remplace pas l’original.", "20 MB maximum. The returned file does not replace the original.")}</p>
          </div>
          <FormField control={form.control} name="comment" render={({ field }) => <FormItem>
            <FormLabel>{w("Commentaire (facultatif)", "Comment (optional)")}</FormLabel>
            <FormControl><textarea {...field} disabled={busy} maxLength={2000} rows={4}
              className="w-full rounded-md border p-3 text-sm" data-testid="input-return-document-comment" /></FormControl>
            <FormMessage />
          </FormItem>} />
          {error && <p role="alert" className="text-sm text-red-600" data-testid="error-return-document">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" disabled={busy} onClick={onClose} className="text-sm px-3 py-2" data-testid="button-cancel-return-document">{w("Annuler", "Cancel")}</button>
            <button type="submit" disabled={busy || !file} className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: C.navy }} data-testid="button-send-return-document">
              {busy ? stage === "uploading" ? w("Téléversement…", "Uploading…") : w("Envoi…", "Sending…") : w("Envoyer à la Direction", "Send to Management")}
            </button>
          </div>
        </form>
      </Form>
    </DialogContent>
  </Dialog>;
}