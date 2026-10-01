import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { C } from "@/lib/theme";
import {
  cancelAudioProcessing,
  processAudioLocally,
  type AudioDraft,
  type AudioLanguage,
  type AudioProcessingProgress,
} from "@/lib/audio-processing";

type AudioComposerProps = {
  onChange: (value: AudioDraft | null) => void;
  mode: "upload" | "record";
  disabled?: boolean;
};

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_RECORDING_MS = 120_000;

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm|mp4)$/i.test(file.name);
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function AudioComposer({ onChange, mode, disabled = false }: AudioComposerProps) {
  const [draft, setDraft] = useState<AudioDraft | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<AudioLanguage>("fr");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<AudioProcessingProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingPartsRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const processingAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      processingAbortRef.current?.abort(new Error("Le compositeur audio a été fermé."));
      cancelAudioProcessing();
      if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.stop();
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!draft) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.file]);

  function publish(next: AudioDraft | null): void {
    setDraft(next);
    onChange(next);
  }

  function setSourceLanguageAndDraft(language: AudioLanguage): void {
    setSourceLanguage(language);
    if (!draft) return;
    const next: AudioDraft = {
      ...draft,
      sourceLanguage: language,
      targetLanguage: language === "fr" ? "es" : "fr",
    };
    publish(next);
  }

  function acceptAudio(file: File | Blob, fileName: string): void {
    if (file.size <= 0) {
      setError("Le fichier audio est vide.");
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError("Le fichier audio dépasse la limite de 20 Mo.");
      return;
    }
    if (file instanceof File && !isAudioFile(file)) {
      setError("Sélectionnez un fichier audio reconnu.");
      return;
    }
    setError("");
    setProgress(null);
    publish({
      file,
      fileName,
      transcript: "",
      translation: "",
      sourceLanguage,
      targetLanguage: sourceLanguage === "fr" ? "es" : "fr",
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    if (file) acceptAudio(file, file.name);
    event.currentTarget.value = "";
  }

  function stopRecording(): void {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsRecording(false);
  }

  async function startRecording(): Promise<void> {
    setError("");
    publish(null);
    setProgress(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L’enregistrement audio n’est pas pris en charge par ce navigateur. Vous pouvez choisir un autre navigateur ou saisir les textes manuellement après avoir sélectionné un fichier.");
      return;
    }
    setIsStartingRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recordingStreamRef.current = stream;
      recordingPartsRef.current = [];
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
      const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingPartsRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("L’enregistrement du microphone a échoué. Vérifiez les autorisations du navigateur puis réessayez.");
        stopRecording();
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingPartsRef.current, { type: recorder.mimeType || "audio/webm" });
        recordingPartsRef.current = [];
        if (mountedRef.current && blob.size > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          acceptAudio(blob, `enregistrement-${timestamp}.webm`);
        }
        stream.getTracks().forEach((track) => track.stop());
        if (recordingStreamRef.current === stream) recordingStreamRef.current = null;
        recorderRef.current = null;
      };
      recorder.start(1000);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (recordingError) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      const message = recordingError instanceof Error && recordingError.name === "NotAllowedError"
        ? "L’accès au microphone a été refusé. Autorisez le microphone puis réessayez, ou saisissez les textes manuellement."
        : recordingError instanceof Error
          ? `Impossible de démarrer le microphone : ${recordingError.message}`
          : "Impossible de démarrer le microphone. Vous pouvez saisir les textes manuellement.";
      if (mountedRef.current) setError(message);
    } finally {
      if (mountedRef.current) setIsStartingRecording(false);
    }
  }

  useEffect(() => {
    if (!isRecording) return;
    const interval = window.setInterval(() => {
      setRecordingSeconds((current) => Math.min(120, current + 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  function updateText(field: "transcript" | "translation", value: string): void {
    if (!draft) return;
    publish({ ...draft, [field]: value });
  }

  async function transcribeAndTranslate(): Promise<void> {
    if (!draft) return;
    setError("");
    setProgress(null);
    setIsProcessing(true);
    const controller = new AbortController();
    processingAbortRef.current = controller;
    try {
      const result = await processAudioLocally(
        draft.file,
        draft.sourceLanguage,
        draft.targetLanguage,
        setProgress,
        controller.signal,
      );
      if (mountedRef.current) {
        const next = { ...draft, ...result };
        setDraft(next);
        onChange(next);
      }
    } catch (processingError) {
      if (mountedRef.current) {
        setError(processingError instanceof Error
          ? processingError.message
          : "Le traitement audio local a échoué. Vous pouvez saisir les textes manuellement.");
      }
    } finally {
      processingAbortRef.current = null;
      if (mountedRef.current) setIsProcessing(false);
    }
  }

  const fieldStyle = {
    border: `1px solid ${C.line}`,
    color: C.ink,
  };
  const actionStyle = {
    background: C.copper,
    color: "#fff",
  };

  return (
    <section className="space-y-4 rounded-lg bg-white p-4" style={{ border: `1px solid ${C.line}` }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Message audio</h3>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.inkSoft }}>
          Le traitement reste sur cet appareil. Au premier usage, les modèles ONNX publics sont téléchargés dans le navigateur et peuvent demander de la bande passante. Aucun audio ni texte n’est envoyé à un service d’inférence.
        </p>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <label htmlFor="somiren-audio-file" className="block text-sm font-medium" style={{ color: C.ink }}>
            Fichier audio (20 Mo maximum)
          </label>
          <input
            ref={fileInputRef}
            id="somiren-audio-file"
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm,.mp4"
            disabled={disabled || isProcessing}
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium disabled:opacity-50"
            style={{ color: C.inkSoft }}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={disabled || isStartingRecording || isProcessing}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              style={actionStyle}
            >
              {isStartingRecording ? "Connexion au microphone…" : "Démarrer l’enregistrement"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{ background: C.redBg, color: C.red }}
            >
              Arrêter l’enregistrement
            </button>
          )}
          <span className="text-xs" style={{ color: isRecording ? C.red : C.inkSoft }} aria-live="polite">
            {isRecording ? `Enregistrement en cours : ${recordingSeconds} s sur 120 s maximum` : "Microphone utilisé uniquement pour enregistrer ce message."}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="somiren-audio-language" className="block text-sm font-medium" style={{ color: C.ink }}>
          Langue parlée
        </label>
        <select
          id="somiren-audio-language"
          value={sourceLanguage}
          disabled={disabled || isProcessing}
          onChange={(event) => setSourceLanguageAndDraft(event.target.value as AudioLanguage)}
          className="w-full rounded-md bg-white px-3 py-2 text-sm disabled:opacity-50"
          style={fieldStyle}
        >
          <option value="fr">Français — traduction vers l’espagnol</option>
          <option value="es">Espagnol — traduction vers le français</option>
        </select>
      </div>

      {draft && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs" style={{ color: C.inkSoft }}>
                {draft.fileName} · {formatSize(draft.file.size)}
              </p>
              <button
                type="button"
                onClick={() => {
                  publish(null);
                  setError("");
                  setProgress(null);
                }}
                disabled={disabled || isProcessing}
                className="text-xs underline underline-offset-2 disabled:opacity-50"
                style={{ color: C.red }}
              >
                Retirer le fichier audio
              </button>
            </div>
            {previewUrl && <audio controls preload="metadata" src={previewUrl} className="w-full" aria-label="Aperçu audio" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void transcribeAndTranslate()}
              disabled={disabled || isProcessing}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              style={actionStyle}
            >
              {isProcessing ? "Traitement local en cours…" : "Transcrire et traduire"}
            </button>
            {isProcessing && (
              <button
                type="button"
                onClick={cancelAudioProcessing}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                disabled={disabled}
                style={{ borderColor: C.line, color: C.ink }}
              >
                Annuler
              </button>
            )}
          </div>
          {progress && (
            <div className="space-y-1" role="status" aria-live="polite">
              <p className="text-xs" style={{ color: C.inkSoft }}>{progress.message}</p>
              {typeof progress.progress === "number" && (
                <progress className="h-2 w-full accent-orange-700" max={100} value={progress.progress} />
              )}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="somiren-audio-transcript" className="block text-sm font-medium" style={{ color: C.ink }}>
                Transcription — {draft.sourceLanguage === "fr" ? "français" : "espagnol"}
              </label>
              <textarea
                id="somiren-audio-transcript"
                value={draft.transcript}
                onChange={(event) => updateText("transcript", event.target.value)}
                disabled={disabled || isProcessing}
                rows={5}
                className="w-full resize-y rounded-md px-3 py-2 text-sm disabled:opacity-60"
                style={fieldStyle}
                placeholder="La transcription apparaît ici et reste modifiable."
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="somiren-audio-translation" className="block text-sm font-medium" style={{ color: C.ink }}>
                Traduction — {draft.targetLanguage === "fr" ? "français" : "espagnol"}
              </label>
              <textarea
                id="somiren-audio-translation"
                value={draft.translation}
                onChange={(event) => updateText("translation", event.target.value)}
                disabled={disabled || isProcessing}
                rows={5}
                className="w-full resize-y rounded-md px-3 py-2 text-sm disabled:opacity-60"
                style={fieldStyle}
                placeholder="La traduction apparaît ici et reste modifiable."
              />
            </div>
          </div>
        </>
      )}

      {error && <p role="alert" className="text-sm leading-relaxed" style={{ color: C.red }}>{error}</p>}
      {!draft && (
        <p className="text-xs" style={{ color: C.inkSoft }}>
          {mode === "upload"
            ? "Après sélection, les deux champs de texte restent modifiables, même si le traitement local n’est pas disponible."
            : "Les enregistrements sont limités à 120 secondes. En cas d’échec du microphone ou des modèles, utilisez la saisie manuelle."}
        </p>
      )}
    </section>
  );
}