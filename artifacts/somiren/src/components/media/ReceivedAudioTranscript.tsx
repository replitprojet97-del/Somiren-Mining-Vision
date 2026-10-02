import { useEffect, useRef, useState } from "react";
import { fetchPrivateMediaLink } from "@/lib/private-media";
import { processAudioLocally, type AudioLanguage, type AudioProcessingProgress, type AudioProcessingResult } from "@/lib/audio-processing";
import { useWorkspaceLocale } from "@/lib/workspace-locale";

/** Receiver-only, opt-in local processing. Never modifies or resends the message. */
export function ReceivedAudioTranscript({ fileEndpoint, sourceLanguage }: {
  fileEndpoint: string;
  sourceLanguage: AudioLanguage;
}) {
  const { w } = useWorkspaceLocale();
  const [language, setLanguage] = useState(sourceLanguage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<AudioProcessingProgress | null>(null);
  const [result, setResult] = useState<AudioProcessingResult | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => {
    controller.current?.abort();
    controller.current = null;
  }, [fileEndpoint]);

  async function transcribe() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setProgress(null);
    setResult(null);
    try {
      const link = await fetchPrivateMediaLink(fileEndpoint);
      abort.signal.throwIfAborted();
      const response = await fetch(link.url, { credentials: "omit", signal: abort.signal });
      if (!response.ok) throw new Error(w("Impossible de récupérer l’audio. Réessayez.", "Unable to retrieve audio. Please try again."));
      const file = await response.blob();
      abort.signal.throwIfAborted();
      const processed = await processAudioLocally(file, language, language === "fr" ? "es" : "fr", next => {
        if (!abort.signal.aborted) setProgress(next);
      }, abort.signal);
      if (!abort.signal.aborted) setResult(processed);
    } catch {
      if (!abort.signal.aborted) setError(w("La transcription a échoué. Vous pouvez réessayer ou écouter l’audio directement.", "Transcription failed. You can try again or listen to the audio directly."));
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setBusy(false);
        setProgress(null);
      }
    }
  }

  return (
    <div className="space-y-2 rounded border border-gray-200 bg-white p-2" data-testid="received-audio-transcription">
      <label className="block text-xs">
        {w("Langue de l’audio reçu", "Received audio language")}
        <select value={language} onChange={event => { setLanguage(event.target.value as AudioLanguage); setResult(null); }}
          disabled={busy} className="ml-2 rounded border p-1">
          <option value="fr">{w("Français", "French")}</option>
          <option value="es">{w("Espagnol", "Spanish")}</option>
        </select>
      </label>
      <button type="button" onClick={() => void transcribe()} disabled={busy}
        className="rounded bg-[#b4682f] px-3 py-2 text-xs text-white disabled:opacity-50" data-testid="button-transcribe-received-audio">
        {busy ? w("Transcription en cours…", "Transcribing…") : w("Transcrire et traduire (facultatif)", "Transcribe and translate (optional)")}
      </button>
      {busy && <button type="button" className="ml-2 text-xs underline" onClick={() => controller.current?.abort()}>
        {w("Annuler", "Cancel")}
      </button>}
      {progress && <p role="status" className="text-xs">{progress.stage === "translate" ? w("Traduction en cours…", "Translating…") : w("Transcription en cours…", "Transcribing…")}</p>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {result && <div className="space-y-2">
        <div><b className="text-xs">{w("Transcription", "Transcript")}</b><p className="whitespace-pre-wrap break-words">{result.transcript}</p></div>
        <div><b className="text-xs">{w("Traduction", "Translation")}</b><p className="whitespace-pre-wrap break-words">{result.translation}</p></div>
      </div>}
    </div>
  );
}