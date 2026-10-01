import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, privateUploadsTable } from "@workspace/db";
import { getWorkspaceActor } from "./collaboratorAuth";
import {
  isAllowedPrivateUpload,
  isConsumableUpload,
  MAX_PROFILE_PHOTO_SIZE_BYTES,
  matchesUploadedMetadata,
  normalizeStorageObjectUrl,
  storageUrlFromResponse,
  validateProfilePhotoImage,
} from "./privateMediaValidation";

const router: IRouter = Router();
const bucket = "somiren-private";
const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  kind: z.enum(["document", "audio", "video", "profile-photo"]),
}).strict();
type UploadAsset = typeof privateUploadsTable.$inferSelect;

function storageConfig(): { baseUrl: string; secret: string } | undefined {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const secret = process.env.SUPABASE_SECRET_KEY;
  return baseUrl && secret ? { baseUrl, secret } : undefined;
}

function safeFileName(value: string): string {
  return value.replace(/[\/\\\u0000-\u001f\u007f]/g, "_").slice(0, 255);
}

function canUploadWorkspaceFile(current: { role: string; permissions: string[] }): boolean {
  return current.role === "ADMIN"
    || (current.permissions.includes("workspace:write") && current.permissions.includes("UPLOAD_DOCUMENTS"));
}

function requestActor(req: Request, res: Response, next: () => void): void {
  void getWorkspaceActor(req).then((current) => {
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const selfServicePhotoRequest = (
      req.body && typeof req.body === "object" && req.body.kind === "profile-photo"
    ) || /^\/storage\/uploads\/[^/]+\/complete$/.test(req.path);
    if (!selfServicePhotoRequest && !canUploadWorkspaceFile(current)) {
      res.status(403).json({ error: "Upload permission required" });
      return;
    }
    res.locals.privateMediaActor = current;
    next();
  }).catch(() => {
    res.status(503).json({ error: "Upload authorization is temporarily unavailable" });
  });
}

async function readBoundedStorageBody(response: globalThis.Response, maxBytes: number): Promise<Uint8Array | undefined> {
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const contentLength = Number(response.headers.get("content-length"));
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function consumeUpload(
  tx: any,
  assetId: string,
  uploaderId: number,
  kind: "document" | "audio" | "video",
  purpose: "document" | "message-audio" | "meeting-video",
): Promise<UploadAsset | undefined> {
  const [asset] = await tx.select().from(privateUploadsTable).where(and(
    eq(privateUploadsTable.id, assetId),
    eq(privateUploadsTable.uploadedById, uploaderId),
    eq(privateUploadsTable.status, "complete"),
    eq(privateUploadsTable.kind, kind),
  )).limit(1);
  if (!asset || !isConsumableUpload(asset, uploaderId, kind)) return undefined;
  const [consumed] = await tx.update(privateUploadsTable)
    .set({ status: "consumed", purpose, updatedAt: new Date() })
    .where(and(
      eq(privateUploadsTable.id, asset.id),
      eq(privateUploadsTable.uploadedById, uploaderId),
      eq(privateUploadsTable.kind, kind),
      eq(privateUploadsTable.status, "complete"),
    ))
    .returning();
  return consumed;
}

export async function getConsumedAsset(assetId: string, purpose: string): Promise<UploadAsset | undefined> {
  const [asset] = await db.select().from(privateUploadsTable).where(and(
    eq(privateUploadsTable.id, assetId),
    eq(privateUploadsTable.status, "consumed"),
    eq(privateUploadsTable.purpose, purpose),
  )).limit(1);
  return asset;
}

export async function createDownloadUrl(asset: UploadAsset, expiresIn = 300): Promise<string | undefined> {
  const config = storageConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.baseUrl}/storage/v1/object/sign/${bucket}/${encodeURIComponent(asset.objectPath)}`, {
      method: "POST",
      headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn }),
    });
    if (!response.ok) return undefined;
    const payload = await response.json() as { signedURL?: string };
    if (!payload.signedURL) return undefined;
    if (/^https?:\/\//i.test(payload.signedURL)) return payload.signedURL;
    const suffix = payload.signedURL.startsWith("/") ? payload.signedURL : `/${payload.signedURL}`;
    return `${config.baseUrl}/storage/v1${suffix}`;
  } catch {
    return undefined;
  }
}

export async function cleanupReplacedProfilePhoto(
  assetId: string,
  ownerId: number,
  warn: (error: unknown) => void,
): Promise<void> {
  const config = storageConfig();
  if (!config) {
    warn(new Error("Private file storage is not configured; the replaced profile photo was retained."));
    return;
  }
  try {
    const [asset] = await db.select().from(privateUploadsTable).where(and(
      eq(privateUploadsTable.id, assetId),
      eq(privateUploadsTable.uploadedById, ownerId),
      eq(privateUploadsTable.kind, "profile-photo"),
      eq(privateUploadsTable.status, "consumed"),
      eq(privateUploadsTable.purpose, "profile-photo"),
    )).limit(1);
    if (!asset) return;

    // The database's ON DELETE RESTRICT references are the final safety check:
    // never remove a storage object while any workspace record still points at it.
    const [deleted] = await db.delete(privateUploadsTable).where(and(
      eq(privateUploadsTable.id, asset.id),
      eq(privateUploadsTable.uploadedById, ownerId),
      eq(privateUploadsTable.kind, "profile-photo"),
      eq(privateUploadsTable.status, "consumed"),
      eq(privateUploadsTable.purpose, "profile-photo"),
    )).returning({ objectPath: privateUploadsTable.objectPath });
    if (!deleted) return;

    const response = await fetch(`${config.baseUrl}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [deleted.objectPath] }),
    });
    if (!response.ok) warn(new Error(`Supabase could not remove replaced photo object (HTTP ${response.status}).`));
  } catch (error) {
    // Cleanup is best-effort. In particular, a foreign-key restriction means
    // the object is still referenced and must be retained.
    warn(error);
  }
}

router.post("/storage/uploads/request-url", requestActor, async (req, res): Promise<void> => {
  const parsed = uploadRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid upload request" });
    return;
  }
  const { fileName, contentType, size, kind } = parsed.data;
  const actor = res.locals.privateMediaActor as { id: number; role: string; permissions: string[] };
  if (kind !== "profile-photo" && !canUploadWorkspaceFile(actor)) {
    res.status(403).json({ error: "Upload permission required" });
    return;
  }
  if (!isAllowedPrivateUpload(kind, size, contentType)) {
    res.status(400).json({ error: "File size or content type is not allowed for this upload kind" });
    return;
  }
  const config = storageConfig();
  if (!config) {
    res.status(503).json({ error: "Private file storage is not configured" });
    return;
  }
  const assetId = randomUUID();
  const objectPath = randomUUID();
  try {
    const signed = await fetch(`${config.baseUrl}/storage/v1/object/upload/sign/${bucket}/${objectPath}`, {
      method: "POST",
      headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ upsert: false }),
    });
    if (!signed.ok) {
      req.log.warn("Private storage upload URL request failed");
      res.status(502).json({ error: "Could not create a private upload URL" });
      return;
    }
    const payload = await signed.json() as { url?: string; signedURL?: string };
    const uploadURL = normalizeStorageObjectUrl(config.baseUrl, storageUrlFromResponse(payload));
    if (!uploadURL) {
      req.log.warn("Private storage returned no upload URL");
      res.status(502).json({ error: "Could not create a private upload URL" });
      return;
    }
    await db.insert(privateUploadsTable).values({
      id: assetId,
      uploadedById: actor.id,
      objectPath,
      fileName: safeFileName(fileName),
      contentType,
      size,
      kind,
      status: "pending",
    });
    res.status(201).json({ assetId, uploadURL, method: "PUT", headers: { "Content-Type": contentType } });
  } catch {
    req.log.warn("Private storage upload URL setup failed");
    res.status(502).json({ error: "Could not create a private upload URL" });
  }
});

router.post("/storage/uploads/:assetId/complete", requestActor, async (req, res): Promise<void> => {
  const assetId = z.string().uuid().safeParse(req.params.assetId);
  if (!assetId.success) {
    res.status(400).json({ error: "Invalid asset id" });
    return;
  }
  const actor = res.locals.privateMediaActor as { id: number };
  const [asset] = await db.select().from(privateUploadsTable).where(and(
    eq(privateUploadsTable.id, assetId.data),
    eq(privateUploadsTable.uploadedById, actor.id),
    eq(privateUploadsTable.status, "pending"),
  )).limit(1);
  if (!asset) {
    res.status(404).json({ error: "Pending upload not found" });
    return;
  }
  const current = res.locals.privateMediaActor as { id: number; role: string; permissions: string[] };
  if (asset.kind !== "profile-photo" && !canUploadWorkspaceFile(current)) {
    res.status(403).json({ error: "Upload permission required" });
    return;
  }
  const config = storageConfig();
  if (!config) {
    res.status(503).json({ error: "Private file storage is not configured" });
    return;
  }
  try {
    const response = await fetch(`${config.baseUrl}/storage/v1/object/info/${bucket}/${encodeURIComponent(asset.objectPath)}`, {
      headers: { apikey: config.secret },
    });
    if (!response.ok) {
      res.status(400).json({ error: "Uploaded file metadata could not be verified" });
      return;
    }
    const metadata = await response.json() as { size?: number; content_type?: string };
    const actualSize = Number(metadata.size);
    const actualType = metadata.content_type;
    if (!matchesUploadedMetadata(asset, { size: actualSize, content_type: actualType })) {
      res.status(400).json({ error: "Uploaded file size or content type does not match the declaration" });
      return;
    }
    if (asset.kind === "profile-photo") {
      const imageResponse = await fetch(
        `${config.baseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(asset.objectPath)}`,
        { headers: { apikey: config.secret } },
      );
      if (!imageResponse.ok) {
        res.status(400).json({ error: "Uploaded profile photo could not be verified as a supported image" });
        return;
      }
      if (actualSize > MAX_PROFILE_PHOTO_SIZE_BYTES) {
        res.status(400).json({ error: "Profile photos must not exceed 5 MiB" });
        return;
      }
      const imageBytes = await readBoundedStorageBody(imageResponse, MAX_PROFILE_PHOTO_SIZE_BYTES);
      if (!imageBytes || imageBytes.byteLength !== actualSize) {
        res.status(400).json({ error: "Profile photo data is incomplete or exceeds the 5 MiB limit" });
        return;
      }
      if (!await validateProfilePhotoImage(asset.contentType, imageBytes)) {
        res.status(400).json({ error: "Profile photos must be complete, uncorrupted JPEG, PNG, or WebP images of at most 25 megapixels" });
        return;
      }
    }
    const [completed] = await db.update(privateUploadsTable).set({ status: "complete", updatedAt: new Date() })
      .where(and(eq(privateUploadsTable.id, asset.id), eq(privateUploadsTable.status, "pending"), eq(privateUploadsTable.uploadedById, actor.id)))
      .returning();
    if (!completed) {
      res.status(409).json({ error: "Upload is no longer pending" });
      return;
    }
    res.json({ assetId: completed.id, fileName: completed.fileName, contentType: completed.contentType, size: completed.size });
  } catch {
    req.log.warn("Private storage metadata verification failed");
    res.status(502).json({ error: "Uploaded file metadata could not be verified" });
  }
});

export default router;