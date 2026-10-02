import { useState } from "react";
import { Download } from "lucide-react";
import { C } from "@/lib/theme";
import { openSigned, errMsg } from "../../shared/signed";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export function DocOpenButton({ doc, compact, testId }: { doc: any; compact?: boolean; testId?: string }) {
  const { w } = useWorkspaceLocale();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!doc?.downloadPath || !doc?.assetId) return null;
  const open = () => {
    setErr(null); setBusy(true);
    openSigned(doc.downloadPath).catch(e => setErr(errMsg(e, w("Ouverture impossible.", "Unable to open file.")))).finally(() => setBusy(false));
  };
  return (
    <div className={compact ? "inline-flex flex-col items-end" : "mt-2"}>
      <button type="button" disabled={busy} onClick={open} data-testid={testId}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium hover:underline disabled:opacity-50" style={{ color: C.copper }}
        aria-label={w("Ouvrir la pièce jointe", "Open attachment")}>
        <Download size={14} /> {compact ? w("Ouvrir", "Open") : <>{w("Ouvrir la pièce jointe", "Open attachment")}{doc.fileName ? ` (${doc.fileName})` : ""}</>}
      </button>
      {err && <p className="text-xs text-red-600 mt-1" role="alert">{err}</p>}
    </div>
  );
}
