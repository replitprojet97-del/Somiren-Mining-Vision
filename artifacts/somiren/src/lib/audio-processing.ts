import { getActiveLanguage } from "@/lib/workspace-locale";
import { localizeApiMessage } from "@/i18n/api-error-translations";

export type AudioDraft = {
  file: File | Blob;
  fileName: string;
  transcript: string;
  translation: string;
  sourceLanguage: "fr" | "es";
  targetLanguage: "fr" | "es";
};

export type AudioProcessingProgress = {
  stage: "download" | "transcribe" | "translate";
  message: string;
  progress?: number;
};

export type AudioProcessingResult = {
  transcript: string;
  translation: string;
};

export type AudioLanguage = "fr" | "es";

const audioMessagePairs: readonly (readonly [french: string, english: string])[] = [
  ["Le fichier audio est vide.", "The audio file is empty."],
  ["Le fichier audio dépasse la limite de 20 Mo.", "The audio file exceeds the 20 MB limit."],
  ["Sélectionnez un fichier audio reconnu.", "Select a supported audio file."],
  ["L’enregistrement audio n’est pas pris en charge par ce navigateur. Vous pouvez choisir un autre navigateur ou saisir les textes manuellement après avoir sélectionné un fichier.", "Audio recording is not supported by this browser. Try another browser or select a file and enter the text manually."],
  ["L’enregistrement du microphone a échoué. Vérifiez les autorisations du navigateur puis réessayez.", "Microphone recording failed. Check your browser permissions and try again."],
  ["L’accès au microphone a été refusé. Autorisez le microphone puis réessayez, ou saisissez les textes manuellement.", "Microphone access was denied. Allow microphone access and try again, or enter the text manually."],
  ["Impossible de démarrer le microphone. Vérifiez les autorisations du navigateur puis réessayez, ou saisissez les textes manuellement.", "Unable to start the microphone. Check your browser permissions and try again, or enter the text manually."],
  ["Le traitement audio local a échoué. Vous pouvez saisir les textes manuellement.", "Local audio processing failed. You can enter the text manually."],
  ["Le traitement audio local a échoué. Vérifiez le fichier ou réessayez, ou saisissez les textes manuellement.", "Local audio processing failed. Check the file or try again, or enter the text manually."],
  ["Le traitement audio IA local a échoué. Vérifiez votre connexion pour télécharger les modèles, puis réessayez ou saisissez les textes manuellement.", "Local AI audio processing failed. Check your connection to download the models, then try again or enter the text manually."],
  ["Traitement audio annulé.", "Audio processing was cancelled."],
  ["Traitement annulé.", "Processing cancelled."],
  ["Un autre traitement audio est déjà en cours dans cette page.", "Another audio process is already running on this page."],
  ["Ce navigateur ne prend pas en charge le traitement audio local. Vous pouvez saisir les textes manuellement.", "This browser does not support local audio processing. You can enter the text manually."],
  ["Le moteur audio local n’a pas pu démarrer.", "The local audio engine could not start."],
  ["Ce navigateur ne peut pas décoder l’audio localement. Vous pouvez saisir les textes manuellement.", "This browser cannot decode audio locally. You can enter the text manually."],
  ["Ce navigateur ne prend pas en charge le moteur audio local. Vous pouvez saisir les textes manuellement.", "This browser does not support the local audio engine. You can enter the text manually."],
  ["La mémoire disponible sur cet appareil est trop faible pour les modèles audio locaux. Vous pouvez saisir les textes manuellement.", "This device does not have enough memory for the local audio models. You can enter the text manually."],
  ["Le traitement local a dépassé son délai de 15 minutes. Vous pouvez saisir les textes manuellement.", "Local processing exceeded 15 minutes. You can enter the text manually."],
  ["Ce format audio n’est pas pris en charge ou le fichier est endommagé. Choisissez un autre fichier ou saisissez les textes manuellement.", "This audio format is unsupported or the file is damaged. Choose another file or enter the text manually."],
  ["Le fichier ne contient pas de durée audio exploitable.", "The file does not contain a usable audio duration."],
  ["La transcription locale n’a produit aucun texte. Vous pouvez saisir le texte manuellement.", "Local transcription did not produce any text. You can enter the text manually."],
  ["La traduction locale n’a produit aucun texte. Vous pouvez saisir la traduction manuellement.", "Local translation did not produce any text. You can enter the translation manually."],
  ["Le moteur WASM ONNX n’est pas disponible dans ce navigateur. Vous pouvez saisir les textes manuellement.", "The ONNX WASM engine is not available in this browser. You can enter the text manually."],
  ["Préparation de l’audio dans ce navigateur…", "Preparing audio in this browser…"],
  ["Transcription locale…", "Transcribing locally…"],
  ["Transcription du segment en cours…", "Transcribing audio segment…"],
  ["Transcription et traduction terminées dans ce navigateur.", "Transcription and translation completed in this browser."],
];

/** Re-localize cached audio errors/progress when the collaborator changes language. */
export function localizeAudioMessage(message: string, lang: "fr" | "en"): string {
  const localizedApiMessage = localizeApiMessage(message, lang);
  if (localizedApiMessage !== message) return localizedApiMessage;

  const pair = audioMessagePairs.find(([french, english]) => message === french || message === english);
  if (pair) return pair[lang === "en" ? 1 : 0];

  const dynamicPairs: ReadonlyArray<readonly [RegExp, (match: RegExpExecArray) => string]> = [
    [/^Transcription locale du segment (\d+) sur (\d+)…$/u, ([, current, total]) => lang === "en" ? `Local transcription, segment ${current} of ${total}…` : `Transcription locale du segment ${current} sur ${total}…`],
    [/^Local transcription, segment (\d+) of (\d+)…$/u, ([, current, total]) => lang === "en" ? `Local transcription, segment ${current} of ${total}…` : `Transcription locale du segment ${current} sur ${total}…`],
    [/^Traduction locale \((\d+) sur (\d+)\)…$/u, ([, current, total]) => lang === "en" ? `Translating locally (${current} of ${total})…` : `Traduction locale (${current} sur ${total})…`],
    [/^Translating locally \((\d+) of (\d+)\)…$/u, ([, current, total]) => lang === "en" ? `Translating locally (${current} of ${total})…` : `Traduction locale (${current} sur ${total})…`],
    [/^Téléchargement du modèle de transcription(.*)$/u, ([, suffix]) => `${lang === "en" ? "Downloading transcription model" : "Téléchargement du modèle de transcription"}${suffix}`],
    [/^Downloading transcription model(.*)$/u, ([, suffix]) => `${lang === "en" ? "Downloading transcription model" : "Téléchargement du modèle de transcription"}${suffix}`],
    [/^Téléchargement du modèle de traduction(.*)$/u, ([, suffix]) => `${lang === "en" ? "Downloading translation model" : "Téléchargement du modèle de traduction"}${suffix}`],
    [/^Downloading translation model(.*)$/u, ([, suffix]) => `${lang === "en" ? "Downloading translation model" : "Téléchargement du modèle de traduction"}${suffix}`],
  ];
  for (const [pattern, localize] of dynamicPairs) {
    const match = pattern.exec(message);
    if (match) return localize(match);
  }
  return message;
}

/**
 * Model licenses checked against the upstream model cards:
 * - https://huggingface.co/Xenova/whisper-tiny (Apache-2.0)
 * - https://huggingface.co/Xenova/opus-mt-fr-es (ONNX port of Helsinki-NLP/opus-mt-fr-es)
 * - https://huggingface.co/Xenova/opus-mt-es-fr (ONNX port of Helsinki-NLP/opus-mt-es-fr)
 * - https://huggingface.co/Helsinki-NLP/opus-mt-fr-es (Apache-2.0)
 * - https://huggingface.co/Helsinki-NLP/opus-mt-es-fr (Apache-2.0)
 *
 * The ONNX model ports inherit the upstream Helsinki-NLP model licenses.
 */
export const LOCAL_AUDIO_MODELS = {
  transcription: { id: "Xenova/whisper-tiny", license: "Apache-2.0" },
  translation: {
    "fr-es": { id: "Xenova/opus-mt-fr-es", license: "Apache-2.0" },
    "es-fr": { id: "Xenova/opus-mt-es-fr", license: "Apache-2.0" },
  },
} as const;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_CHUNK_SECONDS = 120;
const SAMPLE_RATE = 16_000;
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

type WorkerMessage =
  | { type: "PROGRESS"; requestId: number; stage: AudioProcessingProgress["stage"]; message: string; progress?: number }
  | { type: "RESULT"; requestId: number; transcript: string; translation: string }
  | { type: "ERROR"; requestId: number; message: string };

type AudioWorkerRequest = {
  type: "PROCESS";
  requestId: number;
  audio: ArrayBuffer;
  sourceLanguage: AudioLanguage;
  targetLanguage: AudioLanguage;
  uiLanguage: "fr" | "en";
};

let worker: Worker | null = null;
let nextRequestId = 0;
let activeRequestId: number | null = null;
let activeProgress: ((progress: AudioProcessingProgress) => void) | null = null;
let activeResolve: ((result: AudioProcessingResult) => void) | null = null;
let activeReject: ((error: Error) => void) | null = null;
let activeCleanup: (() => void) | null = null;
let activeController: AbortController | null = null;
let processing = false;

function readableError(error: unknown): Error {
  if (error instanceof Error && error.name === "AudioProcessingError") return error;
  if (error instanceof Error && error.name === "AbortError") {
    return localizedError("Traitement audio annulé.", "Audio processing was cancelled.");
  }
  return localizedError(
    "Le traitement audio local a échoué. Vérifiez le fichier ou réessayez, ou saisissez les textes manuellement.",
    "Local audio processing failed. Check the file or try again, or enter the text manually.",
  );
}

function localizedError(french: string, english: string, lang = getActiveLanguage()): Error {
  const error = new Error(lang === "en" ? english : french);
  error.name = "AudioProcessingError";
  return error;
}

function localizedText(french: string, english: string, lang = getActiveLanguage()): string {
  return lang === "en" ? english : french;
}

function makeWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    throw localizedError("Ce navigateur ne prend pas en charge le traitement audio local. Vous pouvez saisir les textes manuellement.", "This browser does not support local audio processing. You can enter the text manually.");
  }

  const instance = new Worker(new URL("./audio.worker.ts", import.meta.url), { type: "module" });
  instance.addEventListener("message", (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (message.requestId !== activeRequestId) return;

    if (message.type === "PROGRESS") {
      activeProgress?.({
        stage: message.stage,
        message: message.message,
        progress: message.progress,
      });
      return;
    }

    const resolve = activeResolve;
    const reject = activeReject;
    activeCleanup?.();
    activeCleanup = null;
    activeRequestId = null;
    activeResolve = null;
    activeReject = null;
    activeProgress = null;

    if (message.type === "RESULT") {
      resolve?.({ transcript: message.transcript, translation: message.translation });
    } else {
      const workerError = new Error(message.message);
      workerError.name = "AudioProcessingError";
      reject?.(workerError);
    }
  });
  instance.addEventListener("error", (event) => {
    const reject = activeReject;
    activeCleanup?.();
    activeCleanup = null;
    activeRequestId = null;
    activeResolve = null;
    activeReject = null;
    activeProgress = null;
    worker?.terminate();
    worker = null;
    reject?.(localizedError("Le moteur audio local n’a pas pu démarrer.", "The local audio engine could not start."));
  });
  worker = instance;
  return instance;
}

function terminateWorker(error?: Error): void {
  worker?.terminate();
  worker = null;
  const reject = activeReject;
  activeCleanup?.();
  activeCleanup = null;
  activeRequestId = null;
  activeResolve = null;
  activeReject = null;
  activeProgress = null;
  if (error) reject?.(error);
}

function requestWorker(
  audio: Float32Array,
  sourceLanguage: AudioLanguage,
  targetLanguage: AudioLanguage,
  uiLanguage: "fr" | "en",
  onProgress: (progress: AudioProcessingProgress) => void,
  signal: AbortSignal,
): Promise<AudioProcessingResult> {
  if (signal.aborted) return Promise.reject(readableError(signal.reason));
  const instance = makeWorker();
  const requestId = ++nextRequestId;
  const request: AudioWorkerRequest = {
    type: "PROCESS",
    requestId,
    audio: audio.buffer as ArrayBuffer,
    sourceLanguage,
    targetLanguage,
    uiLanguage,
  };

  return new Promise((resolve, reject) => {
    activeRequestId = requestId;
    activeProgress = onProgress;
    activeResolve = resolve;
    activeReject = reject;
    const abort = () => {
      terminateWorker(readableError(signal.reason));
    };
    signal.addEventListener("abort", abort, { once: true });
    activeCleanup = () => {
      signal.removeEventListener("abort", abort);
    };

    try {
      instance.postMessage(request, [audio.buffer]);
    } catch (error) {
      activeCleanup?.();
      activeCleanup = null;
      activeRequestId = null;
      activeResolve = null;
      activeReject = null;
      activeProgress = null;
      reject(readableError(error));
    }
  });
}

function checkBrowserSupport(): void {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    throw localizedError("Ce navigateur ne peut pas décoder l’audio localement. Vous pouvez saisir les textes manuellement.", "This browser cannot decode audio locally. You can enter the text manually.");
  }
  if (typeof Worker === "undefined") {
    throw localizedError("Ce navigateur ne prend pas en charge le moteur audio local. Vous pouvez saisir les textes manuellement.", "This browser does not support the local audio engine. You can enter the text manually.");
  }
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memoryGb === "number" && memoryGb < 2) {
    throw localizedError("La mémoire disponible sur cet appareil est trop faible pour les modèles audio locaux. Vous pouvez saisir les textes manuellement.", "This device does not have enough memory for the local audio models. You can enter the text manually.");
  }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw readableError(signal.reason);
}

function waitForAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(readableError(signal.reason));
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(readableError(signal.reason));
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(readableError(error));
      },
    );
  });
}

function createMonoChunk(audio: AudioBuffer, startSeconds: number, endSeconds: number): Float32Array {
  const sourceRate = audio.sampleRate;
  const sourceStart = Math.floor(startSeconds * sourceRate);
  const sourceEnd = Math.min(audio.length, Math.floor(endSeconds * sourceRate));
  const targetLength = Math.max(1, Math.floor(((sourceEnd - sourceStart) / sourceRate) * SAMPLE_RATE));
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
  const result = new Float32Array(targetLength);

  for (let index = 0; index < targetLength; index += 1) {
    const position = sourceStart + (index * sourceRate) / SAMPLE_RATE;
    const left = Math.min(sourceEnd - 1, Math.floor(position));
    const right = Math.min(sourceEnd - 1, left + 1);
    const fraction = position - left;
    let mixed = 0;
    for (const channel of channels) {
      mixed += channel[left] * (1 - fraction) + channel[right] * fraction;
    }
    result[index] = mixed / channels.length;
  }
  return result;
}

export async function processAudioLocally(
  file: File | Blob,
  sourceLanguage: AudioLanguage,
  targetLanguage: AudioLanguage,
  onProgress: (progress: AudioProcessingProgress) => void,
  externalSignal?: AbortSignal,
): Promise<AudioProcessingResult> {
  const uiLanguage = getActiveLanguage();
  if (processing) throw localizedError("Un autre traitement audio est déjà en cours dans cette page.", "Another audio process is already running on this page.", uiLanguage);
  if (file.size > MAX_FILE_BYTES) throw localizedError("Le fichier audio dépasse la limite de 20 Mo.", "The audio file exceeds the 20 MB limit.", uiLanguage);
  checkBrowserSupport();

  processing = true;
  const controller = new AbortController();
  activeController = controller;
  const externalAbort = () => controller.abort(externalSignal?.reason ?? localizedError("Traitement annulé.", "Processing cancelled.", uiLanguage));
  externalSignal?.addEventListener("abort", externalAbort, { once: true });
  if (externalSignal?.aborted) externalAbort();
  const timeout = window.setTimeout(() => {
    controller.abort(localizedError("Le traitement local a dépassé son délai de 15 minutes. Vous pouvez saisir les textes manuellement.", "Local processing exceeded 15 minutes. You can enter the text manually.", uiLanguage));
    terminateWorker(readableError(controller.signal.reason));
  }, PROCESSING_TIMEOUT_MS);
  let audioContext: AudioContext | null = null;

  try {
    throwIfAborted(controller.signal);
    onProgress({ stage: "transcribe", message: localizedText("Préparation de l’audio dans ce navigateur…", "Preparing audio in this browser…", uiLanguage) });
    audioContext = new AudioContext();
    const audioData = await waitForAbort(file.arrayBuffer(), controller.signal);
    let decoded: AudioBuffer;
    try {
      decoded = await waitForAbort(audioContext.decodeAudioData(audioData), controller.signal);
    } catch (error) {
      if (controller.signal.aborted) throw readableError(error);
      throw localizedError("Ce format audio n’est pas pris en charge ou le fichier est endommagé. Choisissez un autre fichier ou saisissez les textes manuellement.", "This audio format is unsupported or the file is damaged. Choose another file or enter the text manually.", uiLanguage);
    }
    throwIfAborted(controller.signal);

    const duration = decoded.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw localizedError("Le fichier ne contient pas de durée audio exploitable.", "The file does not contain a usable audio duration.", uiLanguage);
    }

    const chunkCount = Math.ceil(duration / MAX_CHUNK_SECONDS);
    const transcriptParts: string[] = [];
    const translationParts: string[] = [];

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      throwIfAborted(controller.signal);
      const start = chunkIndex * MAX_CHUNK_SECONDS;
      const end = Math.min(duration, start + MAX_CHUNK_SECONDS);
      const chunk = createMonoChunk(decoded, start, end);
      onProgress({
        stage: "transcribe",
        message: chunkCount > 1
          ? localizedText(`Transcription locale du segment ${chunkIndex + 1} sur ${chunkCount}…`, `Local transcription, segment ${chunkIndex + 1} of ${chunkCount}…`, uiLanguage)
          : localizedText("Transcription locale…", "Transcribing locally…", uiLanguage),
        progress: Math.round((chunkIndex / chunkCount) * 100),
      });
      const result = await requestWorker(chunk, sourceLanguage, targetLanguage, uiLanguage, onProgress, controller.signal);
      if (result.transcript.trim()) transcriptParts.push(result.transcript.trim());
      if (result.translation.trim()) translationParts.push(result.translation.trim());
    }

    const transcript = transcriptParts.join(" ").trim();
    const translation = translationParts.join(" ").trim();
    if (!transcript) {
      throw localizedError("La transcription locale n’a produit aucun texte. Vous pouvez saisir le texte manuellement.", "Local transcription did not produce any text. You can enter the text manually.", uiLanguage);
    }
    if (!translation) {
      throw localizedError("La traduction locale n’a produit aucun texte. Vous pouvez saisir la traduction manuellement.", "Local translation did not produce any text. You can enter the translation manually.", uiLanguage);
    }
    onProgress({ stage: "translate", message: localizedText("Transcription et traduction terminées dans ce navigateur.", "Transcription and translation completed in this browser.", uiLanguage), progress: 100 });
    return { transcript, translation };
  } catch (error) {
    const readable = readableError(error);
    if (controller.signal.aborted) terminateWorker(readable);
    throw readable;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", externalAbort);
    processing = false;
    if (activeController === controller) activeController = null;
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close().catch(() => undefined);
    }
  }
}

/** Terminate the local model worker and release its ONNX/WASM memory. */
export function cancelAudioProcessing(): void {
  const error = localizedError("Traitement audio annulé.", "Audio processing cancelled.");
  activeController?.abort(error);
  terminateWorker(error);
}