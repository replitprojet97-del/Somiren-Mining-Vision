import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toDataURL } from "qrcode";
import { AlertTriangle, Check, Copy, Download, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspaceAuth } from "@/contexts/WorkspaceAuthContext";
import { useTwoFactor } from "@/hooks/use-two-factor";
import { C } from "@/lib/theme";
import { Pill } from "./components/UI";
import { useWorkspaceLocale } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

type Flow = "setup-password" | "setup-code" | "disable" | "regenerate" | "recovery";
type RecoveryPurpose = "setup" | "regeneration";
type Operation = "setup" | "enable" | "disable" | "regenerate" | null;

function localizeTwoFactorError(message: string, lang: "fr" | "en"): string {
  const apiMessage = localizeApiMessage(message, lang);
  const pairs: Record<string, readonly [string, string]> = {
    "Connexion impossible. Vérifiez votre connexion réseau et réessayez.": ["Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again."],
    "Unable to connect. Check your connection and try again.": ["Connexion impossible. Vérifiez votre connexion réseau et réessayez.", "Unable to connect. Check your connection and try again."],
    "Le code de configuration a expiré. Recommencez pour en générer un nouveau.": ["Le code de configuration a expiré. Recommencez pour en générer un nouveau.", "The setup code has expired. Start again to generate a new one."],
    "The setup code has expired. Start again to generate a new one.": ["Le code de configuration a expiré. Recommencez pour en générer un nouveau.", "The setup code has expired. Start again to generate a new one."],
    "Le QR code n'a pas pu être généré sur cet appareil. Utilisez la clé de configuration ci-dessous.": ["Le QR code n'a pas pu être généré sur cet appareil. Utilisez la clé de configuration ci-dessous.", "The QR code could not be generated on this device. Use the setup key below."],
    "The QR code could not be generated on this device. Use the setup key below.": ["Le QR code n'a pas pu être généré sur cet appareil. Utilisez la clé de configuration ci-dessous.", "The QR code could not be generated on this device. Use the setup key below."],
    "Impossible de démarrer la configuration.": ["Impossible de démarrer la configuration.", "Could not start setup."],
    "Could not start setup.": ["Impossible de démarrer la configuration.", "Could not start setup."],
    "Code incorrect. Vérifiez l'application et réessayez.": ["Code incorrect. Vérifiez l'application et réessayez.", "Incorrect code. Check your authenticator app and try again."],
    "Incorrect code. Check your authenticator app and try again.": ["Code incorrect. Vérifiez l'application et réessayez.", "Incorrect code. Check your authenticator app and try again."],
    "L'opération n'a pas pu être effectuée.": ["L'opération n'a pas pu être effectuée.", "The operation could not be completed."],
    "The operation could not be completed.": ["L'opération n'a pas pu être effectuée.", "The operation could not be completed."],
    "Trop de tentatives. Réessayez plus tard.": ["Trop de tentatives. Réessayez plus tard.", "Too many attempts. Please try again later."],
    "Too many attempts. Please try again later.": ["Trop de tentatives. Réessayez plus tard.", "Too many attempts. Please try again later."],
    "L’authentification à deux facteurs est indisponible pour le moment. Aucun changement n'a été effectué.": ["L’authentification à deux facteurs est indisponible pour le moment. Aucun changement n'a été effectué.", "Two-factor authentication is currently unavailable. No changes were made."],
    "Two-factor authentication is currently unavailable. No changes were made.": ["L’authentification à deux facteurs est indisponible pour le moment. Aucun changement n'a été effectué.", "Two-factor authentication is currently unavailable. No changes were made."],
    "Le code de vérification ou la demande est invalide. Vérifiez le code et réessayez.": ["Le code de vérification ou la demande est invalide. Vérifiez le code et réessayez.", "The verification code or request is invalid. Check the code and try again."],
    "The verification code or request is invalid. Check the code and try again.": ["Le code de vérification ou la demande est invalide. Vérifiez le code et réessayez.", "The verification code or request is invalid. Check the code and try again."],
    "Le mot de passe actuel est incorrect.": ["Le mot de passe actuel est incorrect.", "The current password is incorrect."],
    "The current password is incorrect.": ["Le mot de passe actuel est incorrect.", "The current password is incorrect."],
    "Le mot de passe ou le code de vérification est incorrect.": ["Le mot de passe ou le code de vérification est incorrect.", "The password or verification code is incorrect."],
    "The password or verification code is incorrect.": ["Le mot de passe ou le code de vérification est incorrect.", "The password or verification code is incorrect."],
    "Codes copiés. Conservez-les hors ligne.": ["Codes copiés. Conservez-les hors ligne.", "Codes copied. Store them offline."],
    "Codes copied. Store them offline.": ["Codes copiés. Conservez-les hors ligne.", "Codes copied. Store them offline."],
    "Copie indisponible sur cet appareil. Vous pouvez télécharger les codes.": ["Copie indisponible sur cet appareil. Vous pouvez télécharger les codes.", "Copying is unavailable on this device. You can download the codes."],
    "Copying is unavailable on this device. You can download the codes.": ["Copie indisponible sur cet appareil. Vous pouvez télécharger les codes.", "Copying is unavailable on this device. You can download the codes."],
  };
  const pair = pairs[message];
  return pair ? pair[lang === "en" ? 1 : 0] : apiMessage;
}

export default function TwoFactorSettings() {
  const { profile, refresh } = useWorkspaceAuth();
  const { lang, w } = useWorkspaceLocale();
  const { statusQuery, setup, enable, disable, regenerateRecoveryCodes } = useTwoFactor(profile?.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flow, setFlow] = useState<Flow>("setup-password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryPurpose, setRecoveryPurpose] = useState<RecoveryPurpose>("setup");
  const [recoveryAcknowledged, setRecoveryAcknowledged] = useState(false);
  const [flowError, setFlowError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [pendingOperation, setPendingOperation] = useState<Operation>(null);
  const flowGeneration = useRef(0);

  const clearFlow = useCallback(() => {
    flowGeneration.current += 1;
    setFlow("setup-password");
    setPassword("");
    setCode("");
    setSecret("");
    setQrCode("");
    setExpiresAt("");
    setSecondsRemaining(null);
    setRecoveryCodes([]);
    setRecoveryAcknowledged(false);
    setFlowError("");
    setCopyMessage("");
    setPendingOperation(null);
  }, []);

  useEffect(() => {
    setDialogOpen(false);
    clearFlow();
  }, [profile?.id, clearFlow]);

  useEffect(() => () => {
    flowGeneration.current += 1;
  }, []);

  useEffect(() => {
    if (flow !== "setup-code" || !expiresAt) return;
    const updateExpiration = () => {
      const expires = Date.parse(expiresAt);
      if (!Number.isFinite(expires)) return;
      const remaining = Math.max(0, Math.ceil((expires - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        setFlow("setup-password");
        setSecret("");
        setQrCode("");
        setExpiresAt("");
        setCode("");
        setFlowError(w("Le code de configuration a expiré. Recommencez pour en générer un nouveau.", "The setup code has expired. Start again to generate a new one."));
      }
    };
    updateExpiration();
    const timer = window.setInterval(updateExpiration, 1000);
    return () => window.clearInterval(timer);
  }, [flow, expiresAt]);

  const openFlow = (nextFlow: Flow) => {
    clearFlow();
    setFlow(nextFlow);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && (isPending || (flow === "recovery" && !recoveryAcknowledged))) return;
    setDialogOpen(open);
    if (!open) clearFlow();
  };

  async function submitSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const generation = flowGeneration.current;
    setFlowError("");
    setPendingOperation("setup");
    try {
      const result = await setup(password);
      if (generation !== flowGeneration.current) return;
      setPassword("");
      setSecret(result.secret);
      setExpiresAt(result.expiresAt);
      setCode("");
      setFlow("setup-code");
      try {
        const image = await toDataURL(result.otpauthUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 256,
        });
        if (generation === flowGeneration.current) setQrCode(image);
      } catch {
        if (generation === flowGeneration.current) {
          setFlowError(w("Le QR code n'a pas pu être généré sur cet appareil. Utilisez la clé de configuration ci-dessous.", "The QR code could not be generated on this device. Use the setup key below."));
        }
      }
    } catch (caught) {
      if (generation === flowGeneration.current) {
        setFlowError(caught instanceof Error ? caught.message : w("Impossible de démarrer la configuration.", "Could not start setup."));
      }
    } finally {
      if (generation === flowGeneration.current) setPendingOperation(null);
    }
  }

  async function submitEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const generation = flowGeneration.current;
    setFlowError("");
    setPendingOperation("enable");
    try {
      const result = await enable(code.trim());
      if (generation !== flowGeneration.current) return;
      setCode("");
      setRecoveryCodes(result.recoveryCodes);
      setRecoveryPurpose("setup");
      setRecoveryAcknowledged(false);
      setFlow("recovery");
      void refresh();
    } catch (caught) {
      if (generation === flowGeneration.current) {
        setFlowError(caught instanceof Error ? caught.message : w("Code incorrect. Vérifiez l'application et réessayez.", "Incorrect code. Check your authenticator app and try again."));
      }
    } finally {
      if (generation === flowGeneration.current) setPendingOperation(null);
    }
  }

  async function submitSensitiveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const generation = flowGeneration.current;
    setFlowError("");
    setPendingOperation(flow === "disable" ? "disable" : "regenerate");
    try {
      if (flow === "disable") {
        await disable({ password, code: code.trim() });
        if (generation !== flowGeneration.current) return;
        clearFlow();
        setDialogOpen(false);
        void refresh();
      } else if (flow === "regenerate") {
        const result = await regenerateRecoveryCodes({ password, code: code.trim() });
        if (generation !== flowGeneration.current) return;
        setPassword("");
        setCode("");
        setRecoveryCodes(result.recoveryCodes);
        setRecoveryPurpose("regeneration");
        setRecoveryAcknowledged(false);
        setFlow("recovery");
        void refresh();
      }
    } catch (caught) {
      if (generation === flowGeneration.current) {
        setFlowError(caught instanceof Error ? caught.message : w("L'opération n'a pas pu être effectuée.", "The operation could not be completed."));
      }
    } finally {
      if (generation === flowGeneration.current) setPendingOperation(null);
    }
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopyMessage(w("Codes copiés. Conservez-les hors ligne.", "Codes copied. Store them offline."));
    } catch {
      setCopyMessage(w("Copie indisponible sur cet appareil. Vous pouvez télécharger les codes.", "Copying is unavailable on this device. You can download the codes."));
    }
  }

  function downloadRecoveryCodes() {
    const fileContent = [
      w("SOMIREN — Codes de secours 2FA", "SOMIREN — Two-factor recovery codes"),
      "",
      w("Conservez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu’une seule fois.", "Store these codes in a safe place. Each code can only be used once."),
      "",
      ...recoveryCodes,
      "",
    ].join("\n");
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = lang === "en" ? "two-factor-recovery-codes.txt" : "codes-de-secours-2fa.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  const status = statusQuery.data;
  const isPending = pendingOperation !== null;
  const showStatusError = statusQuery.isError;

  return (
    <>
      <div className="flex-1 rounded-lg bg-gray-50 p-4" style={{ border: `1px solid ${C.line}` }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm" style={{ color: C.ink }}>{w("Authentification à deux facteurs", "Two-factor authentication")}</h3>
          {statusQuery.isLoading ? (
            <span className="text-xs" style={{ color: C.inkSoft }}>{w("Chargement…", "Loading…")}</span>
          ) : status?.available ? (
            <Pill tone={status.enabled ? "basse" : "neutral"}>{status.enabled ? w("Activée", "Enabled") : w("Non configurée", "Not configured")}</Pill>
          ) : null}
        </div>
        {statusQuery.isLoading && (
          <p className="text-sm" style={{ color: C.inkSoft }}>{w("Vérification de la disponibilité…", "Checking availability…")}</p>
        )}
        {showStatusError && (
          <div className="space-y-2 text-sm" role="alert">
            <p style={{ color: "#b42318" }}>
              {statusQuery.error instanceof Error ? localizeTwoFactorError(statusQuery.error.message, lang) : w("Impossible de vérifier la configuration 2FA.", "Could not check two-factor authentication settings.")}
            </p>
            <button
              type="button"
              onClick={() => void statusQuery.refetch()}
              className="inline-flex items-center gap-1 font-medium"
              style={{ color: C.copper }}
            >
              <RefreshCw size={13} /> {w("Réessayer", "Try again")}
            </button>
          </div>
        )}
        {!statusQuery.isLoading && !showStatusError && status && !status.available && (
          <p className="text-sm" role="status" style={{ color: C.inkSoft }}>
            {w("Ce service n'est pas disponible pour le moment. Aucun changement n'a été effectué.", "This service is currently unavailable. No changes have been made.")}
          </p>
        )}
        {!statusQuery.isLoading && !showStatusError && status?.available && (
          <>
            <p className="text-sm" style={{ color: C.inkSoft }}>
              {status.enabled
                ? lang === "en"
                  ? "A code from your authenticator app is required each time you sign in. " + status.recoveryCodesRemaining + ` recovery code${status.recoveryCodesRemaining === 1 ? "" : "s"} remaining.`
                  : `Un code de votre application d'authentification est demandé à chaque connexion. ${status.recoveryCodesRemaining} code${status.recoveryCodesRemaining === 1 ? "" : "s"} de secours restant${status.recoveryCodesRemaining === 1 ? "" : "s"}.`
                : w("Ajoutez une étape de vérification avec une application d'authentification compatible TOTP. Cette option est facultative.", "Add a verification step with a TOTP-compatible authenticator app. This option is optional.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {!status.enabled ? (
                <button
                  type="button"
                  onClick={() => openFlow("setup-password")}
                  className="text-sm font-medium"
                  style={{ color: C.copper }}
                >
                  {w("Configurer la 2FA", "Set up two-factor authentication")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openFlow("regenerate")}
                    className="text-sm font-medium"
                    style={{ color: C.copper }}
                  >
                    {w("Régénérer les codes de secours", "Regenerate recovery codes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openFlow("disable")}
                    className="text-sm font-medium text-red-700"
                  >
                    {w("Désactiver", "Disable")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#e5ded4] bg-white sm:max-w-2xl">
          {flow === "setup-password" && (
            <>
              <DialogTitle style={{ color: C.ink }}>{w("Configurer l'authentification à deux facteurs", "Set up two-factor authentication")}</DialogTitle>
              <DialogDescription style={{ color: C.inkSoft }}>
                {w("Saisissez votre mot de passe actuel pour générer une clé de configuration temporaire.", "Enter your current password to generate a temporary setup key.")}
              </DialogDescription>
              <form onSubmit={submitSetup} className="space-y-4">
                <label className="block text-sm font-medium" style={{ color: C.ink }}>
                  {w("Mot de passe actuel", "Current password")}
                  <input
                    autoFocus
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2"
                    style={{ borderColor: C.line }}
                  />
                </label>
                {flowError && <p role="alert" className="text-sm text-red-700">{localizeTwoFactorError(flowError, lang)}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => handleDialogChange(false)} className="rounded-md px-4 py-2 text-sm" style={{ color: C.inkSoft }}>{w("Annuler", "Cancel")}</button>
                  <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: C.copper, color: "white" }}>
                    {pendingOperation === "setup" && <Loader2 size={15} className="animate-spin" />} {w("Continuer", "Continue")}
                  </button>
                </div>
              </form>
            </>
          )}

          {flow === "setup-code" && (
            <>
              <DialogTitle style={{ color: C.ink }}>{w("Associer votre application", "Link your authenticator app")}</DialogTitle>
              <DialogDescription style={{ color: C.inkSoft }}>
                {w("Scannez ce QR code dans votre application TOTP (par exemple, une application d'authentification), puis saisissez le code à 6 chiffres affiché.", "Scan this QR code with your TOTP app (such as an authenticator app), then enter the 6-digit code shown.")}
              </DialogDescription>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-center">
                <div className="flex min-h-56 items-center justify-center rounded-lg bg-white p-3" style={{ border: `1px solid ${C.line}` }}>
                  {qrCode ? (
                    <img src={qrCode} alt={w("QR code de configuration 2FA", "Two-factor setup QR code")} className="h-auto max-w-full" width={256} height={256} />
                  ) : (
                    <p className="max-w-xs text-center text-sm" style={{ color: C.inkSoft }}>{w("Le QR code est indisponible ; saisissez la clé manuellement.", "The QR code is unavailable; enter the key manually.")}</p>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.inkSoft }}>{w("Clé de configuration manuelle", "Manual setup key")}</p>
                  <code className="block break-all rounded-md bg-gray-50 p-3 text-sm font-semibold tracking-wider" style={{ color: C.ink, border: `1px solid ${C.line}` }}>{secret}</code>
                  <p className="text-xs" style={{ color: C.inkSoft }}>
                    {w("Cette clé ne sera affichée qu'ici. Elle expire dans", "This key is only shown here. It expires in")} {secondsRemaining ?? "…"} {w("s.", "s.")}
                  </p>
                </div>
              </div>
              <form onSubmit={submitEnable} className="space-y-4">
                <label className="block text-sm font-medium" style={{ color: C.ink }}>
                  {w("Code de l'application", "Authenticator code")}
                  <input
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-1 h-12 w-full rounded-md border bg-white px-3 text-center text-lg tracking-[0.35em] outline-none focus:ring-2"
                    style={{ borderColor: C.line }}
                  />
                </label>
                {flowError && <p role="alert" className="text-sm text-red-700">{localizeTwoFactorError(flowError, lang)}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => handleDialogChange(false)} className="rounded-md px-4 py-2 text-sm" style={{ color: C.inkSoft }}>{w("Annuler", "Cancel")}</button>
                  <button type="submit" disabled={isPending || secondsRemaining === 0} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: C.copper, color: "white" }}>
                    {pendingOperation === "enable" && <Loader2 size={15} className="animate-spin" />} {w("Confirmer l'activation", "Confirm activation")}
                  </button>
                </div>
              </form>
            </>
          )}

          {(flow === "disable" || flow === "regenerate") && (
            <>
              <DialogTitle style={{ color: C.ink }}>{flow === "disable" ? w("Désactiver la 2FA", "Disable two-factor authentication") : w("Régénérer les codes de secours", "Regenerate recovery codes")}</DialogTitle>
              <DialogDescription style={{ color: C.inkSoft }}>
                {flow === "disable"
                  ? w("Confirmez avec votre mot de passe et un code de votre application ou un code de secours.", "Confirm with your password and a code from your authenticator app or a recovery code.")
                  : w("La régénération invalidera immédiatement tous vos anciens codes de secours. Confirmez avec votre mot de passe et un code de l'application ou un code de secours.", "Regenerating will immediately invalidate all your old recovery codes. Confirm with your password and an authenticator app code or recovery code.")}
              </DialogDescription>
              <form onSubmit={submitSensitiveAction} className="space-y-4">
                <label className="block text-sm font-medium" style={{ color: C.ink }}>
                  {w("Mot de passe actuel", "Current password")}
                  <input
                    autoFocus
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2"
                    style={{ borderColor: C.line }}
                  />
                </label>
                <label className="block text-sm font-medium" style={{ color: C.ink }}>
                  {w("Code d'authentification ou code de secours", "Authenticator code or recovery code")}
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="mt-1 h-11 w-full rounded-md border bg-white px-3 outline-none focus:ring-2"
                    style={{ borderColor: C.line }}
                  />
                </label>
                {flow === "regenerate" && (
                  <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle size={18} className="shrink-0" /> {w("Les codes précédents ne fonctionneront plus.", "Your previous codes will no longer work.")}
                  </p>
                )}
                {flowError && <p role="alert" className="text-sm text-red-700">{localizeTwoFactorError(flowError, lang)}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => handleDialogChange(false)} className="rounded-md px-4 py-2 text-sm" style={{ color: C.inkSoft }}>{w("Annuler", "Cancel")}</button>
                  <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: flow === "disable" ? "#b42318" : C.copper, color: "white" }}>
                    {(pendingOperation === "disable" || pendingOperation === "regenerate") && <Loader2 size={15} className="animate-spin" />}
                    {flow === "disable" ? w("Désactiver", "Disable") : w("Remplacer les codes", "Replace codes")}
                  </button>
                </div>
              </form>
            </>
          )}

          {flow === "recovery" && (
            <>
              <DialogTitle style={{ color: C.ink }}>
                {recoveryPurpose === "setup" ? w("2FA activée — codes de secours", "Two-factor authentication enabled — recovery codes") : w("Nouveaux codes de secours", "New recovery codes")}
              </DialogTitle>
              <DialogDescription style={{ color: C.inkSoft }}>
                {recoveryPurpose === "setup"
                  ? w("Enregistrez ces codes maintenant. Ils ne seront affichés qu'une seule fois.", "Save these codes now. They will only be shown once.")
                  : w("Vos anciens codes ont été invalidés. Enregistrez ces nouveaux codes maintenant ; ils ne seront affichés qu'une seule fois.", "Your old codes have been invalidated. Save these new codes now; they will only be shown once.")}
              </DialogDescription>
              <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle size={18} className="shrink-0" /> {w("Conservez-les dans un endroit sûr, de préférence hors ligne. Chaque code ne peut être utilisé qu'une seule fois.", "Store them in a safe place, preferably offline. Each code can only be used once.")}
              </p>
              <div className="grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-4 sm:grid-cols-2" style={{ border: `1px solid ${C.line}` }}>
                {recoveryCodes.map((recoveryCode, index) => (
                  <code key={`${index}-${recoveryCode}`} className="rounded bg-white px-2 py-1.5 text-center text-sm font-semibold tracking-wider" style={{ color: C.ink }}>{recoveryCode}</code>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyRecoveryCodes()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: C.line, color: C.ink }}>
                  <Copy size={15} /> {w("Copier les codes", "Copy codes")}
                </button>
                <button type="button" onClick={downloadRecoveryCodes} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: C.line, color: C.ink }}>
                  <Download size={15} /> {w("Télécharger", "Download")}
                </button>
                {copyMessage && <p role="status" className="self-center text-sm" style={{ color: C.inkSoft }}>{localizeTwoFactorError(copyMessage, lang)}</p>}
              </div>
              <label className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
                <input
                  type="checkbox"
                  checked={recoveryAcknowledged}
                  onChange={(event) => setRecoveryAcknowledged(event.target.checked)}
                  className="mt-1 accent-[#a87950]"
                />
                {w("J'ai conservé ces codes de secours dans un endroit sûr.", "I have stored these recovery codes in a safe place.")}
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!recoveryAcknowledged}
                  onClick={() => handleDialogChange(false)}
                  className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: C.copper, color: "white" }}
                >
                  <Check size={15} /> {w("Terminer", "Finish")}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}