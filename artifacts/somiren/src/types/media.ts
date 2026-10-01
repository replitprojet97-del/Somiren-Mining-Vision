export type Lang = "fr" | "es";

export interface PrivateMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  body?: string | null;
  audioAssetId?: string | null;
  audioFileName?: string | null;
  audioContentType?: string | null;
  transcript?: string | null;
  translation?: string | null;
  sourceLanguage?: Lang | null;
  targetLanguage?: Lang | null;
  createdAt: string;
}

export const LANG_LABEL: Record<Lang, string> = { fr: "Français", es: "Español" };
export const MAX_DOC_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export interface AudioDraft {
  file: File | Blob;
  fileName: string;
  transcript: string;
  translation: string;
  sourceLanguage: Lang;
  targetLanguage: Lang;
}
