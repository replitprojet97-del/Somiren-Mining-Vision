import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  isConfidentialAdminRole,
  isAllowedPrivateUpload,
  isConsumableUpload,
  isReferencePortraitEligible,
  isValidAudioMessage,
  matchesProfilePhotoSignature,
  matchesUploadedMetadata,
  normalizeStorageObjectUrl,
  storageUrlFromResponse,
  validateProfilePhotoImage,
  videoSigningExpirySeconds,
} from "./privateMediaValidation";

test("private upload limits and MIME kinds are enforced", () => {
  assert.equal(isAllowedPrivateUpload("document", 20 * 1024 * 1024, "application/pdf"), true);
  assert.equal(isAllowedPrivateUpload("document", 20 * 1024 * 1024 + 1, "application/pdf"), false);
  assert.equal(isAllowedPrivateUpload("audio", 20 * 1024 * 1024, "audio/webm"), true);
  assert.equal(isAllowedPrivateUpload("audio", 1, "video/mp4"), false);
  assert.equal(isAllowedPrivateUpload("video", 50 * 1024 * 1024, "video/mp4"), true);
  assert.equal(isAllowedPrivateUpload("video", 50 * 1024 * 1024 + 1, "video/mp4"), false);
  assert.equal(isAllowedPrivateUpload("profile-photo", 5 * 1024 * 1024, "image/jpeg"), true);
  assert.equal(isAllowedPrivateUpload("profile-photo", 5 * 1024 * 1024 + 1, "image/png"), false);
  assert.equal(isAllowedPrivateUpload("profile-photo", 1, "image/svg+xml"), false);
  assert.equal(isAllowedPrivateUpload("profile-photo", 1, "image/gif"), false);
});

test("profile photo signatures distinguish declared image formats from unrelated content", () => {
  assert.equal(matchesProfilePhotoSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(matchesProfilePhotoSignature("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
  assert.equal(matchesProfilePhotoSignature("image/webp", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), true);
  assert.equal(matchesProfilePhotoSignature("image/jpeg", new TextEncoder().encode("<svg></svg>")), false);
  assert.equal(matchesProfilePhotoSignature("image/svg+xml", new TextEncoder().encode("<svg></svg>")), false);
  assert.equal(matchesProfilePhotoSignature("image/png", Uint8Array.from([0x89, 0x50, 0x4e])), false);
});

test("profile photos are fully decoded, not accepted on header bytes alone", async () => {
  const tinyPng = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 30, g: 90, b: 160, alpha: 1 },
    },
  }).png().toBuffer();
  const headerOnlyPng = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const headerOnlyWebp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

  assert.equal(await validateProfilePhotoImage("image/png", tinyPng), true);
  assert.equal(await validateProfilePhotoImage("image/png", headerOnlyPng), false);
  assert.equal(await validateProfilePhotoImage("image/webp", headerOnlyWebp), false);
});

test("reference portrait eligibility requires the configured email, exact name, and intended role", () => {
  const eligible = {
    email: "Nuria.Example@somiren.com",
    fullName: "Nuria Molero Rodriguez",
    role: "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR",
  };
  assert.equal(isReferencePortraitEligible(eligible, "nuria.example@somiren.com"), true);
  assert.equal(isReferencePortraitEligible(eligible, undefined), false);
  assert.equal(isReferencePortraitEligible(eligible, "other@example.com"), false);
  assert.equal(isReferencePortraitEligible({ ...eligible, fullName: "Nuria" }, "nuria.example@somiren.com"), false);
  assert.equal(isReferencePortraitEligible({ ...eligible, role: "ADMIN" }, "nuria.example@somiren.com"), false);
});

test("completion requires exact verified storage size and content type", () => {
  const declared = { size: 1234, contentType: "audio/webm" };
  assert.equal(matchesUploadedMetadata(declared, { size: 1234, content_type: "audio/webm" }), true);
  assert.equal(matchesUploadedMetadata(declared, { size: 1233, content_type: "audio/webm" }), false);
  assert.equal(matchesUploadedMetadata(declared, { size: 1234, content_type: "audio/ogg" }), false);
});

test("a completed asset can only be consumed by its uploader and declared kind", () => {
  const asset = { uploadedById: 8, kind: "document", status: "complete" };
  assert.equal(isConsumableUpload(asset, 8, "document"), true);
  assert.equal(isConsumableUpload(asset, 9, "document"), false);
  assert.equal(isConsumableUpload(asset, 8, "audio"), false);
  assert.equal(isConsumableUpload({ ...asset, status: "pending" }, 8, "document"), false);
  assert.equal(isConsumableUpload({ ...asset, status: "consumed" }, 8, "document"), false);
});

test("audio messages allow the file alone and optional legacy texts", () => {
  assert.equal(isValidAudioMessage({ audioAssetId: "asset-id" }), true);
  assert.equal(isValidAudioMessage({}), false);
  assert.equal(isValidAudioMessage({ transcript: "Bonjour", sourceLanguage: "fr", targetLanguage: "es" }), false);
  assert.equal(isValidAudioMessage({ audioAssetId: "asset-id", transcript: "Bonjour" }), false);
  assert.equal(isValidAudioMessage({
    audioAssetId: "asset-id", transcript: "Bonjour", translation: "Hello",
    sourceLanguage: "fr", targetLanguage: "es",
  }), true);
  assert.equal(isValidAudioMessage({
    audioAssetId: "asset-id", transcript: "Bonjour",
    sourceLanguage: "fr", targetLanguage: "es",
  }), true);
  assert.equal(isValidAudioMessage({
    audioAssetId: "asset-id", transcript: "Bonjour", translation: "Hola",
    sourceLanguage: "fr", targetLanguage: "fr",
  }), false);
});

test("Supabase upload URLs from either response key are normalized with one storage prefix", () => {
  const baseUrl = "https://example.supabase.co";
  assert.equal(
    normalizeStorageObjectUrl(baseUrl, storageUrlFromResponse({ url: "/object/upload/sign/somiren-private/uuid?token=upload-token" })),
    "https://example.supabase.co/storage/v1/object/upload/sign/somiren-private/uuid?token=upload-token",
  );
  assert.equal(
    normalizeStorageObjectUrl(baseUrl, storageUrlFromResponse({ signedURL: "/storage/v1/object/upload/sign/somiren-private/uuid?token=legacy-token" })),
    "https://example.supabase.co/storage/v1/object/upload/sign/somiren-private/uuid?token=legacy-token",
  );
  assert.equal(normalizeStorageObjectUrl(baseUrl, "https://evil.example/upload"), undefined);
});

test("confidential admin routes require the ADMIN role only", () => {
  assert.equal(isConfidentialAdminRole("ADMIN"), true);
  assert.equal(isConfidentialAdminRole("EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR"), false);
  assert.equal(isConfidentialAdminRole("COLLABORATOR"), false);
});

test("meeting signed URL expiry cannot outlast the remaining scheduled window", () => {
  const now = new Date("2030-01-01T12:00:00.000Z");
  assert.equal(videoSigningExpirySeconds(new Date(now.getTime() + 3210), now), 3);
  assert.equal(videoSigningExpirySeconds(new Date(now.getTime() + 500), now), 1);
  assert.equal(videoSigningExpirySeconds(now, now), undefined);
  assert.equal(videoSigningExpirySeconds(new Date(now.getTime() - 1), now), undefined);
});