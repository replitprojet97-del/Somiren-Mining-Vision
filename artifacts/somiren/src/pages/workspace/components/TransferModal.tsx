import { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { C } from "@/lib/theme";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export type TransferItem = {
  id: number | string;
  label: string;
  amountText: string;
  instructions?: string | null;
  reason?: string | null;
  serviceName?: string | null;
  signature?: string | null;
  alreadyReported: boolean;
  requestStatus?: string | null;
  canReport: boolean;
};

export function reportStatusLabel(status: string | null | undefined, w: (fr: string, en: string) => string) {
  if (status === "acknowledged") return w("Signalement pris en compte", "Report acknowledged");
  if (status === "declined") return w("Signalement non validé", "Report not accepted");
  return w("En cours de vérification", "Verification in progress");
}

export default function TransferModal({ item, send, onClose }: {
  item: TransferItem;
  send: (id: number | string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { w, lang } = useWorkspaceLocale();
  const [req, setReq] = useState<"idle" | "pending" | "ok" | "error">("idle");
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    alive.current = true;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)") ?? []);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { alive.current = false; document.removeEventListener("keydown", onKey); previouslyFocused?.focus(); };
  }, []);

  const submit = () => {
    if (inFlight.current || req === "ok") return;
    inFlight.current = true;
    setReq("pending"); setErrMessage(null);
    sendRef.current(item.id).then(() => { if (alive.current) setReq("ok"); })
      .catch((e: any) => {
        if (!alive.current) return;
        setErrMessage(e instanceof TypeError ? null : e?.error || e?.message || null);
        setReq("error");
      }).finally(() => { inFlight.current = false; });
  };

  const reported = item.alreadyReported || req === "ok";
  const showAction = item.canReport && !item.alreadyReported && req !== "ok";
  const reason = item.reason?.trim() ? item.reason : null;
  const instr = item.instructions?.trim() ? item.instructions : null;
  const title = w("Détails financiers", "Financial details");
  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(14,34,51,0.55)" }} role="dialog" aria-modal="true" aria-label={title} data-testid="modal-transfer">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 space-y-4 max-h-[90dvh] overflow-y-auto" style={{ border: `1px solid ${C.line}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-7 w-7" />
              <span className="text-xs font-semibold tracking-wide" style={{ color: C.navy }}>SOMIREN S.A.</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: C.amber }}>{item.serviceName || w("Service paie", "Payroll service")}</p>
            <h2 className="text-base font-semibold" style={{ color: C.ink }}>{title} · {item.label}</h2>
            <p className="text-sm" style={{ color: C.inkSoft }}>{item.amountText}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={w("Fermer", "Close")} data-testid="button-close-transfer"><X size={18} /></button>
        </div>

        <div className="space-y-1">
          <p className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: C.inkFaint }}>{w("Motif", "Reason")}</p>
          <p className="text-sm p-3 rounded-md whitespace-pre-wrap" style={{ background: C.bg, color: C.inkSoft }} data-testid="text-transfer-reason">
            {reason || w("Aucun motif n’a été communiqué.", "No reason was provided.")}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: C.amber }}>{w("Consignes", "Instructions")}</p>
          <p className="text-sm p-4 rounded-md whitespace-pre-wrap font-medium" style={{ background: C.amberBg, border: `1px solid ${C.line}`, color: C.ink }} data-testid="text-transfer-instructions">
            {instr || w("Aucune consigne n’a été communiquée.", "No instructions were provided.")}
          </p>
          {item.signature && <p className="text-xs italic" style={{ color: C.inkSoft }}>{item.signature}</p>}
        </div>

        <div className="text-sm space-y-2" aria-live="polite" data-testid="status-transfer-request">
          {reported && req !== "ok" && (
            <p className="font-medium" style={{ color: C.blue }}>{reportStatusLabel(item.requestStatus, w)}</p>
          )}
          {req === "ok" && <p className="flex items-start gap-2" style={{ color: C.green }}><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{w("Votre signalement a été enregistré. La vérification est en cours. Vous recevrez une notification ou un message de l’administration.", "Your report has been recorded. Verification is in progress. You will receive a notification or message from the administration.")}</p>}
          {req === "error" && (
            <p className="flex items-start gap-2" style={{ color: C.red }}><AlertCircle size={15} className="mt-0.5 shrink-0" />{errMessage ? localizeApiMessage(errMessage, lang) : w("Le signalement n’a pas pu être enregistré.", "The report could not be saved.")}</p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium" style={{ border: `1px solid ${C.line}`, color: C.ink }} data-testid="button-done-transfer">{w("Fermer", "Close")}</button>
          {showAction && (
            <button type="button" onClick={submit} disabled={req === "pending"} className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: C.navy }} data-testid="button-report-conditions">
              {req === "pending" && <Loader2 size={14} className="animate-spin" />}
              {req === "error" ? w("Réessayer", "Retry") + " · " : ""}{w("Signaler que les conditions sont remplies", "Report that the conditions have been met")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
