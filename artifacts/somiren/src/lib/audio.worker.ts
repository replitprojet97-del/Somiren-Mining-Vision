/// <reference lib="webworker" />

import type { AudioLanguage, AudioProcessingProgress } from "./audio-processing";

type ProcessRequest = {
  type: "PROCESS";
  requestId: number;
  audio: ArrayBuffer;
  sourceLanguage: AudioLanguage;
  targetLanguage: AudioLanguage;
};

type WorkerResponse =
  | { type: "PROGRESS"; requestId: number; stage: AudioProcessingProgress["stage"]; message: string; progress?: number }
  | { type: "RESULT"; requestId: number; transcript: string; translation: string }
  | { type: "ERROR"; requestId: number; message: string };

type PipelineFunction = (input: unknown, options?: Record<string, unknown>) => Promise<unknown>;

let asrPipeline: Promise<PipelineFunction> | null = null;
const translationPipelines = new Map<string, Promise<PipelineFunction>>();
let transformersPromise: Promise<typeof import("@huggingface/transformers")> | null = null;

function post(response: WorkerResponse): void {
  self.postMessage(response);
}

function getTransformers(): Promise<typeof import("@huggingface/transformers")> {
  if (!transformersPromise) {
    transformersPromise = import("@huggingface/transformers").then((transformers) => {
      transformers.env.allowRemoteModels = true;
      transformers.env.allowLocalModels = false;
      transformers.env.useBrowserCache = true;
    const wasm = transformers.env.backends.onnx.wasm;
    if (!wasm) {
      throw new Error("Le moteur WASM ONNX n’est pas disponible dans ce navigateur. Vous pouvez saisir les textes manuellement.");
    }
    wasm.numThreads = 1;
      return transformers;
    });
  }
  return transformersPromise;
}

async function loadPipeline(task: string, model: string, options: Record<string, unknown>): Promise<PipelineFunction> {
  const { pipeline } = await getTransformers();
  const createPipeline = pipeline as unknown as (
    task: string,
    model: string,
    options: Record<string, unknown>,
  ) => Promise<PipelineFunction>;
  return createPipeline(task, model, options);
}

function progressCallback(requestId: number, stage: "download" | "transcribe" | "translate", label: string) {
  return (event: { status?: string; progress?: number; loaded?: number; total?: number; file?: string }) => {
    const filePart = event.file ? ` (${event.file})` : "";
    const downloadedProgress = typeof event.progress === "number" && Number.isFinite(event.progress)
      ? Math.max(0, Math.min(100, event.progress))
      : undefined;
    post({
      type: "PROGRESS",
      requestId,
      stage,
      message: event.status === "progress" ? `${label}${filePart}` : `${label}${filePart}`,
      progress: downloadedProgress,
    });
  };
}

function getAsr(requestId: number): Promise<PipelineFunction> {
  if (!asrPipeline) {
    const loading = loadPipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
      dtype: "q8",
      progress_callback: progressCallback(requestId, "download", "Téléchargement du modèle de transcription"),
    });
    let cached: Promise<PipelineFunction>;
    cached = loading.catch((error) => {
      if (asrPipeline === cached) asrPipeline = null;
      throw error;
    });
    asrPipeline = cached;
  }
  return asrPipeline;
}

function getTranslator(
  sourceLanguage: AudioLanguage,
  targetLanguage: AudioLanguage,
  requestId: number,
): Promise<PipelineFunction> {
  const model = sourceLanguage === "fr" && targetLanguage === "es"
    ? "Xenova/opus-mt-fr-es"
    : "Xenova/opus-mt-es-fr";
  let translator = translationPipelines.get(model);
  if (!translator) {
    const loading = loadPipeline("translation", model, {
      dtype: "q8",
      progress_callback: progressCallback(requestId, "download", "Téléchargement du modèle de traduction"),
    });
    translator = loading.catch((error) => {
      if (translationPipelines.get(model) === translator) translationPipelines.delete(model);
      throw error;
    });
    translationPipelines.set(model, translator);
  }
  return translator;
}

function extractTranscript(output: unknown): string {
  if (typeof output === "string") return output.trim();
  if (Array.isArray(output)) {
    return output
      .map((entry) => extractTranscript(entry))
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (output && typeof output === "object" && "text" in output) {
    const text = (output as { text?: unknown }).text;
    return typeof text === "string" ? text.trim() : "";
  }
  return "";
}

function extractTranslations(output: unknown): string[] {
  const entries = Array.isArray(output) ? output : [output];
  return entries.map((entry) => {
    if (typeof entry === "string") return entry.trim();
    if (entry && typeof entry === "object" && "translation_text" in entry) {
      const text = (entry as { translation_text?: unknown }).translation_text;
      return typeof text === "string" ? text.trim() : "";
    }
    return "";
  });
}

function splitTranslationText(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (current && `${current} ${trimmed}`.length > 700) {
      parts.push(current);
      current = "";
    }
    if (trimmed.length > 700) {
      if (current) parts.push(current);
      current = "";
      for (let index = 0; index < trimmed.length; index += 700) {
        parts.push(trimmed.slice(index, index + 700));
      }
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }
  if (current) parts.push(current);
  return parts;
}

async function translateTranscript(
  text: string,
  sourceLanguage: AudioLanguage,
  targetLanguage: AudioLanguage,
  requestId: number,
): Promise<string> {
  const parts = splitTranslationText(text);
  const translator = await getTranslator(sourceLanguage, targetLanguage, requestId);
  const translations: string[] = [];
  const batchSize = 8;

  for (let start = 0; start < parts.length; start += batchSize) {
    const batch = parts.slice(start, start + batchSize);
    post({
      type: "PROGRESS",
      requestId,
      stage: "translate",
      message: `Traduction locale (${Math.min(start + batch.length, parts.length)} sur ${parts.length})…`,
      progress: Math.round(((start + batch.length) / parts.length) * 100),
    });
    const result = await translator(batch, { max_new_tokens: 256 });
    const translated = extractTranslations(result);
    translations.push(...translated);
  }
  return translations.filter(Boolean).join(" ").trim();
}

async function processAudio(request: ProcessRequest): Promise<void> {
  try {
    const asr = await getAsr(request.requestId);
    post({
      type: "PROGRESS",
      requestId: request.requestId,
      stage: "transcribe",
      message: "Transcription du segment en cours…",
    });
    // audio-processing.ts has already converted the audio to mono 16 kHz;
    // Transformers.js v3 expects the Float32Array itself, not an audio wrapper.
    const output = await asr(
      new Float32Array(request.audio),
      {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: request.sourceLanguage === "fr" ? "french" : "spanish",
        task: "transcribe",
      },
    );
    const transcript = extractTranscript(output);
    if (!transcript) {
      post({ type: "RESULT", requestId: request.requestId, transcript: "", translation: "" });
      return;
    }

    const translation = await translateTranscript(
      transcript,
      request.sourceLanguage,
      request.targetLanguage,
      request.requestId,
    );
    post({ type: "RESULT", requestId: request.requestId, transcript, translation });
  } catch (error) {
    post({
      type: "ERROR",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Le modèle audio local a échoué.",
    });
  }
}

self.addEventListener("message", (event: MessageEvent<ProcessRequest>) => {
  if (event.data?.type === "PROCESS") void processAudio(event.data);
});