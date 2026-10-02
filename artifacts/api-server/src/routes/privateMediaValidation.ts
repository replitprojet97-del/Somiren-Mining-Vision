import sharp from "sharp";

export type PrivateUploadKind = "document" | "audio" | "video" | "profile-photo";
export const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_PHOTO_PIXELS = 25_000_000;

export function isReferencePortraitEligible(
  actor: { email: string; fullName: string; role: string },
  configuredEmail: string | undefined,
): boolean {
  const configured = configuredEmail?.trim().toLowerCase();
  return Boolean(
    configured
    && actor.email.trim().toLowerCase() === configured
    && actor.fullName === "Nuria Molero Rodriguez"
    && actor.role === "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR",
  );
}

export function isConfidentialAdminRole(role: string): boolean {
  return role === "ADMIN";
}
export type AudioMessageMetadata = {
  audioAssetId?: string;
  transcript?: string;
  translation?: string;
  sourceLanguage?: "fr" | "es";
  targetLanguage?: "fr" | "es";
};

export function isAllowedPrivateUpload(kind: PrivateUploadKind, size: number, contentType: string): boolean {
  const mime = contentType.toLowerCase().split(";")[0]?.trim();
  const maxSize = kind === "video" ? 50 * 1024 * 1024 : kind === "profile-photo" ? MAX_PROFILE_PHOTO_SIZE_BYTES : 20 * 1024 * 1024;
  if (!Number.isInteger(size) || size <= 0 || size > maxSize) return false;
  if (kind === "profile-photo") return /^(image\/(jpeg|png|webp))$/.test(mime ?? "");
  if (kind === "document") {
    return /^(application\/(pdf|octet-stream|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-(excel|powerpoint))|text\/(plain|csv|rtf)|image\/(png|jpeg|webp|gif))$/.test(mime ?? "");
  }
  if (kind === "audio") {
    return /^(audio\/(mpeg|mp3|wav|x-wav|webm|ogg|mp4|aac|flac|m4a|3gpp))$/.test(mime ?? "");
  }
  return /^(video\/(mp4|webm|quicktime|ogg))$/.test(mime ?? "");
}

export function matchesProfilePhotoSignature(contentType: string, bytes: Uint8Array): boolean {
  const mime = contentType.toLowerCase().split(";")[0]?.trim();
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === "image/webp") {
    return bytes.length >= 12
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

export async function validateProfilePhotoImage(contentType: string, bytes: Uint8Array): Promise<boolean> {
  const mime = contentType.toLowerCase().split(";")[0]?.trim();
  if (!matchesProfilePhotoSignature(contentType, bytes)) return false;
  const expectedFormat = mime === "image/jpeg" ? "jpeg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : undefined;
  if (!expectedFormat) return false;

  try {
    const decoderOptions = {
      failOn: "warning" as const,
      limitInputPixels: MAX_PROFILE_PHOTO_PIXELS,
    };
    const metadata = await sharp(bytes, decoderOptions).metadata();
    if (
      metadata.format !== expectedFormat
      || !metadata.width
      || !metadata.height
      || metadata.width * metadata.height * (metadata.pages ?? 1) > MAX_PROFILE_PHOTO_PIXELS
    ) {
      return false;
    }
    // Force a full decode while keeping the generated output tiny. Header-only,
    // truncated, and otherwise corrupt images fail here rather than passing on
    // their magic bytes alone.
    await sharp(bytes, decoderOptions).resize({ width: 1, height: 1, fit: "inside" }).toBuffer();
    return true;
  } catch {
    return false;
  }
}

export function matchesUploadedMetadata(expected: { size: number; contentType: string }, actual: { size?: number; content_type?: string }): boolean {
  return Number(actual.size) === expected.size && actual.content_type === expected.contentType;
}

export function isConsumableUpload(
  asset: { uploadedById: number; kind: string; status: string },
  uploaderId: number,
  kind: PrivateUploadKind,
): boolean {
  return asset.uploadedById === uploaderId && asset.kind === kind && asset.status === "complete";
}

export function isValidAudioMessage(value: AudioMessageMetadata): boolean {
  // Texts are optional. Keep support for legacy messages with bilingual texts.
  if (!value.audioAssetId) return false;
  if (value.sourceLanguage && value.targetLanguage && value.sourceLanguage === value.targetLanguage) return false;
  return !((value.transcript || value.translation) && (!value.sourceLanguage || !value.targetLanguage));
}

export function normalizeStorageObjectUrl(baseUrl: string, path: string | undefined): string | undefined {
  if (!path) return undefined;
  try {
    const base = new URL(baseUrl);
    if (/^https?:\/\//i.test(path)) {
      const full = new URL(path);
      return full.origin === base.origin ? full.toString() : undefined;
    }
    if (path.startsWith("/storage/v1/object/")) return `${base.origin}${path}`;
    if (path.startsWith("/object/")) return `${base.origin}/storage/v1${path}`;
    if (path.startsWith("object/")) return `${base.origin}/storage/v1/${path}`;
  } catch {
    return undefined;
  }
  return undefined;
}

export function storageUrlFromResponse(payload: { url?: string; signedURL?: string }): string | undefined {
  return payload.url ?? payload.signedURL;
}

export function videoSigningExpirySeconds(validUntil: Date, now: Date): number | undefined {
  const remainingMilliseconds = validUntil.getTime() - now.getTime();
  if (remainingMilliseconds <= 0) return undefined;
  return Math.max(1, Math.floor(remainingMilliseconds / 1000));
}