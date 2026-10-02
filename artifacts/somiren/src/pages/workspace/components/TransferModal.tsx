import { useEffect, useRef, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { C } from "@/lib/theme";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

export type TransferItem = {
  id: number | string;
  label: string;
  amountText: string;
  instructions?: string | null;
  serviceName?: string | null;
  signature?: string | null;
  alreadyRequested: boolean;
};

const SIM_MS = 1500;

export default function TransferModal({ item, send, onClose }: {
  item: TransferItem;
  send: (id: number | string) => Promise<unknown>;
  onClose: () => void;
}) {
  const { w } = useWorkspaceLocale();
  const [simDone, setSimDone] = useState(item.alreadyRequested);
  const [req, setReq] = useState<"idle" | "pending" | "ok" | "error">(item.alreadyRequested ? "ok" : "idle");
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
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
    return () => { document.removeEventListener("keydown", onKey); previouslyFocused?.focus(); };
  }, []);

  const submit = () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setReq("pending"); setErrMessage(null);
    sendRef.current(item.id).then(() => { if (alive.current) setReq("ok"); })
      .catch((e: any) => {
        if (!alive.current) return;
        setErrMessage(e instanceof TypeError ? null : e?.error || e?.message || null);
        setReq("error");
      }).finally(() => { inFlight.current = false; });
  };

  useEffect(() => {
    alive.current = true;
    let timer: number | undefined;
    if (!item.alreadyRequested) {
      submit();
      timer = window.setTimeout(() => { if (alive.current) setSimDone(true); }, SIM_MS);
    }
    return () => { alive.current = false; if (timer) window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const instr = item.instructions?.trim();
  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(14,34,51,0.55)" }} role="dialog" aria-modal="true" aria-label={w("Demande de transfert", "Transfer request")} data-testid="modal-transfer">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 space-y-4 max-h-[90dvh] overflow-y-auto" style={{ border: `1px solid ${C.line}` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-7 w-7" />
              <span className="text-xs font-semibold tracking-wide" style={{ color: C.navy }}>SOMIREN S.A.</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: C.amber }}>{item.serviceName || "Service paie"}</p>
            <h2 className="text-base font-semibold" style={{ color: C.ink }}>{w("Demande de transfert", "Transfer request")} · {item.label}</h2>
            <p className="text-sm" style={{ color: C.inkSoft }}>{item.amountText}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={w("Fermer", "Close")} data-testid="button-close-transfer"><X size={18} /></button>
        </div>

        {!simDone ? (
          <div className="flex items-center gap-3 rounded-md p-4 text-sm" style={{ background: C.bg, color: C.ink }} data-testid="status-transfer-simulation">
            <Loader2 size={18} className="animate-spin" />
            <span>{w("Préparation des instructions… Simulation : aucune opération bancaire n’est effectuée.", "Preparing instructions… Simulation: no banking operation is performed.")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] uppercase tracking-wider font-semibold" style={{ color: C.amber }}>{w("Instructions de l’administration", "Administration instructions")}</p>
            <p className="text-sm p-4 rounded-md whitespace-pre-wrap font-medium" style={{ background: C.amberBg, border: `1px solid ${C.line}`, color: C.ink }} data-testid="text-transfer-instructions">
              {instr || w("Aucune instruction n’a été communiquée.", "No instructions were supplied.")}
            </p>
            {item.signature && <p className="text-xs italic" style={{ color: C.inkSoft }}>{item.signature}</p>}
          </div>
        )}

        <div className="text-sm" aria-live="polite" data-testid="status-transfer-request">
          {req === "pending" && <p className="flex items-center gap-2" style={{ color: C.inkSoft }}><Loader2 size={15} className="animate-spin" />{w("Enregistrement de votre demande…", "Recording your request…")}</p>}
          {req === "ok" && <p className="flex items-center gap-2" style={{ color: C.green }}><CheckCircle2 size={15} />{item.alreadyRequested ? w("Demande déjà transmise à l’administration.", "Request already sent to the administration.") : w("Demande enregistrée et transmise à l’administration.", "Request recorded and sent to the administration.")}</p>}
          {req === "error" && (
            <div className="space-y-2">
              <p className="flex items-start gap-2" style={{ color: C.red }}><AlertCircle size={15} className="mt-0.5" />{errMessage || w("La demande n’a pas pu être enregistrée.", "The request could not be saved.")}</p>
              <button type="button" onClick={submit} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ border: `1px solid ${C.line}`, color: C.ink }} data-testid="button-retry-transfer">{w("Réessayer", "Retry")}</button>
            </div>
          )}
        </div>
        <p className="text-xs" style={{ color: C.inkSoft }}>{w("Aucun virement ni paiement n’est déclenché par cette action : il s’agit d’une demande administrative.", "No bank transfer or payment is initiated by this action: it is an administrative request.")}</p>
        <div className="flex justify-end"><button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: C.navy }} data-testid="button-done-transfer">{w("Fermer", "Close")}</button></div>
      </div>
    </div>
  );
}
