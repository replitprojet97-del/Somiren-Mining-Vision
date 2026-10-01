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
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Le traitement audio local a échoué.");
}

function makeWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    throw new Error("Ce navigateur ne prend pas en charge le traitement audio local. Vous pouvez saisir les textes manuellement.");
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
      reject?.(new Error(message.message));
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
    reject?.(new Error(event.message || "Le moteur audio local n’a pas pu démarrer."));
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
    throw new Error("Ce navigateur ne peut pas décoder l’audio localement. Vous pouvez saisir les textes manuellement.");
  }
  if (typeof Worker === "undefined") {
    throw new Error("Ce navigateur ne prend pas en charge le moteur audio local. Vous pouvez saisir les textes manuellement.");
  }
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memoryGb === "number" && memoryGb < 2) {
    throw new Error("La mémoire disponible sur cet appareil est trop faible pour les modèles audio locaux. Vous pouvez saisir les textes manuellement.");
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
  if (processing) throw new Error("Un autre traitement audio est déjà en cours dans cette page.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Le fichier audio dépasse la limite de 20 Mo.");
  checkBrowserSupport();

  processing = true;
  const controller = new AbortController();
  activeController = controller;
  const externalAbort = () => controller.abort(externalSignal?.reason ?? new Error("Traitement annulé."));
  externalSignal?.addEventListener("abort", externalAbort, { once: true });
  if (externalSignal?.aborted) externalAbort();
  const timeout = window.setTimeout(() => {
    controller.abort(new Error("Le traitement local a dépassé son délai de 15 minutes. Vous pouvez saisir les textes manuellement."));
    terminateWorker(readableError(controller.signal.reason));
  }, PROCESSING_TIMEOUT_MS);
  let audioContext: AudioContext | null = null;

  try {
    throwIfAborted(controller.signal);
    onProgress({ stage: "transcribe", message: "Préparation de l’audio dans ce navigateur…" });
    audioContext = new AudioContext();
    const audioData = await waitForAbort(file.arrayBuffer(), controller.signal);
    const decoded = await waitForAbort(audioContext.decodeAudioData(audioData), controller.signal);
    throwIfAborted(controller.signal);

    const duration = decoded.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Le fichier ne contient pas de durée audio exploitable.");
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
          ? `Transcription locale du segment ${chunkIndex + 1} sur ${chunkCount}…`
          : "Transcription locale…",
        progress: Math.round((chunkIndex / chunkCount) * 100),
      });
      const result = await requestWorker(chunk, sourceLanguage, targetLanguage, onProgress, controller.signal);
      if (result.transcript.trim()) transcriptParts.push(result.transcript.trim());
      if (result.translation.trim()) translationParts.push(result.translation.trim());
    }

    const transcript = transcriptParts.join(" ").trim();
    const translation = translationParts.join(" ").trim();
    if (!transcript) {
      throw new Error("La transcription locale n’a produit aucun texte. Vous pouvez saisir le texte manuellement.");
    }
    if (!translation) {
      throw new Error("La traduction locale n’a produit aucun texte. Vous pouvez saisir la traduction manuellement.");
    }
    onProgress({ stage: "translate", message: "Transcription et traduction terminées dans ce navigateur.", progress: 100 });
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
  const error = new Error("Traitement audio annulé.");
  activeController?.abort(error);
  terminateWorker(error);
}