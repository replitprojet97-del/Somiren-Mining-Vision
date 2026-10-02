import {
  activityLogsTable, arrearsTable, casesTable, collaboratorSessionsTable, collaboratorsTable, contactsTable,
  conversationsTable, db, documentAssignmentsTable, documentsTable, executiveRequestsTable, financialRecordsTable,
  meetingParticipantsTable, meetingsTable, messagesTable, notificationsTable, paymentRequirementDocumentsTable,
  paymentRequirementsTable, paymentsTable, strategicNotesTable, tasksTable, videoAuthorizationsTable,
  privateUploadsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { serviceAudioDownloadName } from "../lib/sender-service";
import { getWorkspaceActor } from "./collaboratorAuth";
import { cleanupReplacedProfilePhoto, consumeUpload, createDownloadUrl, getConsumedAsset } from "./privateMedia";
import { isReferencePortraitEligible, isValidAudioMessage, videoSigningExpirySeconds } from "./privateMediaValidation";
import { readableSessionDevice } from "../lib/session-device";
import financeConditionsRouter from "./financeConditions";
import {
  GetWorkspaceFinancialSummaryResponse, ListCollaboratorArrearsResponse,
  GetWorkspaceVideoAccessResponse, JoinWorkspaceVideoMeetingBody, JoinWorkspaceVideoMeetingResponse,
  ListWorkspaceSessionsResponse, RequestArrearTransferParams, RequestArrearTransferResponse,
  RequestSalaryTransferParams, RequestSalaryTransferResponse,
  UpdateWorkspaceTaskBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const idSchema = z.coerce.number().int().positive();
const caseUpdateSchema = z.object({
  status: z.enum(["active", "waiting", "completed", "on_hold"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
  comment: z.string().min(1).max(2000).optional(),
  clarificationRequest: z.string().min(1).max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one update is required");
const taskUpdateSchema = UpdateWorkspaceTaskBody.refine((value) => Object.keys(value).length > 0, "At least one update is required");

type WorkspaceActor = typeof collaboratorsTable.$inferSelect;

async function addActivity(actor: WorkspaceActor, entityType: string, entityId: number | null, action: string, details: Record<string, unknown> = {}) {
  await db.insert(activityLogsTable).values({
    collaboratorId: actor.id, entityType, entityId, action, details,
  });
}

async function requireWorkspaceAccess(req: Request, res: Response, next: () => void): Promise<void> {
  try {
    const actor = await getWorkspaceActor(req);
    if (!actor) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!actor.permissions.includes("workspace:read")) {
      res.status(403).json({ error: "Permission de lecture requise." });
      return;
    }
    res.locals.workspaceActor = actor;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Workspace authorization failed");
    res.status(503).json({ error: "Workspace authorization is temporarily unavailable" });
  }
}

function requireWorkspaceWrite(_req: Request, res: Response, next: () => void): void {
  if (!actor(res).permissions.includes("workspace:write")) {
    res.status(403).json({ error: "Permission de modification requise." });
    return;
  }
  next();
}

function actor(res: Response): WorkspaceActor {
  return res.locals.workspaceActor as WorkspaceActor;
}
function requirePermission(permission: string) {
  return (_req: Request, res: Response, next: () => void): void => {
    if (!actor(res).permissions.includes(permission)) {
      res.status(403).json({ error: `Permission requise: ${permission}` }); return;
    }
    next();
  };
}
const textSchema = z.string().trim().min(1).max(5000);
const assignmentSchema = z.object({ status: z.enum(["received", "in_progress", "submitted", "completed"]).optional(), instruction: z.string().max(5000).optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional(), dueAt: z.coerce.date().nullable().optional() }).refine(v => Object.keys(v).length > 0);
const requestSchema = z.object({ title: textSchema.max(300), description: z.string().max(5000).optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional(), dueAt: z.coerce.date().nullable().optional(), status: z.enum(["new", "accepted", "in_progress", "submitted", "validated", "revision_required", "completed"]).optional() });
const noteSchema = z.object({ title: textSchema.max(300), body: z.string().max(10000).optional(), isShared: z.boolean().optional() });
const threadMessageSchema = z.object({
  body: z.string().trim().min(1).max(10000).optional(),
  audioAssetId: z.string().uuid().optional(),
  transcript: z.string().trim().min(1).max(10000).optional(),
  translation: z.string().trim().min(1).max(10000).optional(),
  sourceLanguage: z.enum(["fr", "es"]).optional(),
  targetLanguage: z.enum(["fr", "es"]).optional(),
}).strict().superRefine((value, ctx) => {
  const hasAudioFields = Boolean(value.audioAssetId || value.transcript || value.translation || value.sourceLanguage || value.targetLanguage);
  if (hasAudioFields && !isValidAudioMessage(value)) {
    ctx.addIssue({ code: "custom", message: "Audio metadata requires an audio file and distinct French/Spanish languages when texts are provided" });
  }
  if (!value.body && !value.audioAssetId) ctx.addIssue({ code: "custom", message: "Message body or audio is required" });
});

async function notifyActiveAdmins(title: string, body: string): Promise<void> {
  const admins = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
  if (admins.length) await db.insert(notificationsTable).values(admins.map(admin => ({ collaboratorId: admin.id, title, body })));
}

router.use(requireWorkspaceAccess);
router.use(financeConditionsRouter(requirePermission));

router.get("/workspace/me", (_req, res): void => {
  const current = actor(res);
  res.json({ profile: { id: current.id, email: current.email, fullName: current.fullName, role: current.role, department: "Direction Générale", employeeId: "SMR-DIR-001" }, permissions: current.permissions });
});

router.get("/workspace/me/photo", async (req, res): Promise<void> => {
  const current = actor(res);
  const referencePortrait = isReferencePortraitEligible(current, process.env.NURIA_EMAIL);
  const [collaborator] = await db.select({
    assetId: collaboratorsTable.profilePhotoAssetId,
    removed: collaboratorsTable.profilePhotoRemoved,
  }).from(collaboratorsTable).where(eq(collaboratorsTable.id, current.id)).limit(1);
  if (!collaborator) {
    res.status(404).json({ error: "Collaborator profile not found" });
    return;
  }
  if (!collaborator.assetId) {
    res.json({ photo: null, removed: collaborator.removed, referencePortrait });
    return;
  }
  const [asset] = await db.select().from(privateUploadsTable).where(and(
    eq(privateUploadsTable.id, collaborator.assetId),
    eq(privateUploadsTable.uploadedById, current.id),
    eq(privateUploadsTable.kind, "profile-photo"),
    eq(privateUploadsTable.status, "consumed"),
    eq(privateUploadsTable.purpose, "profile-photo"),
  )).limit(1);
  if (!asset) {
    req.log.error("Collaborator profile photo metadata is inconsistent");
    res.status(503).json({ error: "Profile photo metadata could not be loaded" });
    return;
  }
  const url = await createDownloadUrl(asset);
  if (!url) {
    req.log.warn("Collaborator profile photo signing failed");
    res.status(502).json({ error: "Could not create a profile photo URL" });
    return;
  }
  res.json({ photo: { url, contentType: asset.contentType, expiresIn: 300 }, removed: false, referencePortrait });
});

router.put("/workspace/me/photo", async (req, res): Promise<void> => {
  const body = z.object({ assetId: z.string().uuid() }).strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid completed profile photo upload is required" });
    return;
  }
  const current = actor(res);
  try {
    const result = await db.transaction(async (tx) => {
      const [collaborator] = await tx.select({
        assetId: collaboratorsTable.profilePhotoAssetId,
      }).from(collaboratorsTable).where(eq(collaboratorsTable.id, current.id)).for("update").limit(1);
      if (!collaborator) return { valid: false as const };
      if (collaborator.assetId === body.data.assetId) {
        return { valid: true as const, replacedAssetId: null };
      }
      const [asset] = await tx.select().from(privateUploadsTable).where(and(
        eq(privateUploadsTable.id, body.data.assetId),
        eq(privateUploadsTable.uploadedById, current.id),
        eq(privateUploadsTable.kind, "profile-photo"),
        eq(privateUploadsTable.status, "complete"),
      )).for("update").limit(1);
      if (!asset) return { valid: false as const };
      const [consumed] = await tx.update(privateUploadsTable).set({
        status: "consumed",
        purpose: "profile-photo",
        updatedAt: new Date(),
      }).where(and(
        eq(privateUploadsTable.id, asset.id),
        eq(privateUploadsTable.uploadedById, current.id),
        eq(privateUploadsTable.kind, "profile-photo"),
        eq(privateUploadsTable.status, "complete"),
      )).returning({ id: privateUploadsTable.id });
      if (!consumed) return { valid: false as const };
      await tx.update(collaboratorsTable).set({
        profilePhotoAssetId: asset.id,
        profilePhotoRemoved: false,
        updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, current.id));
      return {
        valid: true as const,
        replacedAssetId: collaborator.assetId && collaborator.assetId !== asset.id ? collaborator.assetId : null,
      };
    });
    if (!result.valid) {
      res.status(400).json({ error: "Photo upload must be completed and owned by this collaborator" });
      return;
    }
    if (result.replacedAssetId) {
      await cleanupReplacedProfilePhoto(result.replacedAssetId, current.id, (error) => {
        req.log.warn({ err: error }, "Could not clean up the replaced profile photo");
      });
    }
    res.json({ updated: true });
  } catch (error) {
    req.log.error({ err: error }, "Profile photo update failed");
    res.status(503).json({ error: "Could not update the profile photo" });
  }
});

router.delete("/workspace/me/photo", async (req, res): Promise<void> => {
  const current = actor(res);
  try {
    const result = await db.transaction(async (tx) => {
      const [collaborator] = await tx.select({
        assetId: collaboratorsTable.profilePhotoAssetId,
      }).from(collaboratorsTable).where(eq(collaboratorsTable.id, current.id)).for("update").limit(1);
      if (!collaborator) return { found: false as const, oldAssetId: null };
      await tx.update(collaboratorsTable).set({
        profilePhotoAssetId: null,
        profilePhotoRemoved: true,
        updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, current.id));
      return { found: true as const, oldAssetId: collaborator.assetId };
    });
    if (!result.found) {
      res.status(404).json({ error: "Collaborator profile not found" });
      return;
    }
    if (result.oldAssetId) {
      await cleanupReplacedProfilePhoto(result.oldAssetId, current.id, (error) => {
        req.log.warn({ err: error }, "Could not clean up the removed profile photo");
      });
    }
    res.json({ removed: true });
  } catch (error) {
    req.log.error({ err: error }, "Profile photo removal failed");
    res.status(503).json({ error: "Could not remove the profile photo" });
  }
});

router.get("/workspace/dashboard", async (_req, res): Promise<void> => {
  const current = actor(res);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [caseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(casesTable).where(eq(casesTable.assigneeId, current.id));
  const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(and(eq(tasksTable.assigneeId, current.id), sql`${tasksTable.status} <> 'completed'`));
  const [unread] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationsTable).where(and(eq(notificationsTable.collaboratorId, current.id), eq(notificationsTable.isRead, false)));
  const todayWork = await db.select().from(tasksTable).where(and(eq(tasksTable.assigneeId, current.id), lte(tasksTable.dueAt, new Date(today.getTime() + 86400000)), sql`${tasksTable.status} <> 'completed'`)).orderBy(asc(tasksTable.dueAt)).limit(10);
  const urgentCases = await db.select().from(casesTable).where(and(eq(casesTable.assigneeId, current.id), eq(casesTable.priority, "high"), sql`${casesTable.status} <> 'completed'`)).orderBy(desc(casesTable.updatedAt)).limit(10);
  const nextItems = await db.select().from(tasksTable).where(and(eq(tasksTable.assigneeId, current.id), gt(tasksTable.dueAt, new Date()), sql`${tasksTable.status} <> 'completed'`)).orderBy(asc(tasksTable.dueAt)).limit(10);
  const unreadNotifications = await db.select().from(notificationsTable).where(and(eq(notificationsTable.collaboratorId, current.id), eq(notificationsTable.isRead, false))).orderBy(desc(notificationsTable.createdAt)).limit(10);
  res.json({
    counts: { cases: caseCount.count, openTasks: taskCount.count, unreadNotifications: unread.count },
    todayWork,
    urgentCases,
    nextItems,
    unreadNotifications,
  });
});

router.get("/workspace/cases", requirePermission("VIEW_ASSIGNED_CASES"), async (_req, res): Promise<void> => {
  const current = actor(res);
  res.json({ cases: await db.select().from(casesTable).where(eq(casesTable.assigneeId, current.id)).orderBy(desc(casesTable.updatedAt)) });
});
router.post("/workspace/cases", requirePermission("MANAGE_ASSIGNED_CASES"), async (req, res): Promise<void> => {
  const body = z.object({ reference: z.string().trim().min(1).max(100), title: textSchema.max(300), summary: textSchema.max(2000), description: z.string().max(10000).optional(), instructions: z.string().max(5000).optional(), dueDate: z.coerce.date().nullable().optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid case" }); return; } const current = actor(res);
  const [workspaceCase] = await db.insert(casesTable).values({ ...body.data, assigneeId: current.id }).returning(); res.status(201).json({ case: workspaceCase });
});
router.get("/workspace/cases/:id", requirePermission("VIEW_ASSIGNED_CASES"), async (req, res): Promise<void> => {
  const parsed = idSchema.safeParse(req.params.id); if (!parsed.success) { res.status(400).json({ error: "Invalid case id" }); return; }
  const current = actor(res);
  const [workspaceCase] = await db.select().from(casesTable).where(and(eq(casesTable.id, parsed.data), eq(casesTable.assigneeId, current.id)));
  if (!workspaceCase) { res.status(404).json({ error: "Case not found" }); return; }
  const tasks = current.permissions.includes("VIEW_ASSIGNED_TASKS")
    ? await db.select().from(tasksTable).where(and(eq(tasksTable.caseId, workspaceCase.id), eq(tasksTable.assigneeId, current.id))) : [];
  const documents = current.permissions.includes("VIEW_ASSIGNED_DOCUMENTS")
    ? await visibleDocuments(current.id, workspaceCase.id) : [];
  res.json({ case: workspaceCase, tasks, documents });
});
router.patch("/workspace/cases/:id", requirePermission("MANAGE_ASSIGNED_CASES"), async (req, res): Promise<void> => {
  const parsedId = idSchema.safeParse(req.params.id); const body = caseUpdateSchema.safeParse(req.body);
  if (!parsedId.success || !body.success) { res.status(400).json({ error: "Invalid case update" }); return; }
  const current = actor(res);
  const details = { ...body.data }; delete details.notes;
  const [updated] = await db.update(casesTable).set({ status: body.data.status, progress: body.data.progress, notes: body.data.notes, updatedAt: new Date() })
    .where(and(eq(casesTable.id, parsedId.data), eq(casesTable.assigneeId, current.id))).returning();
  if (!updated) { res.status(404).json({ error: "Case not found" }); return; }
  await addActivity(current, "case", updated.id, "updated", details);
  res.json({ case: updated });
});

router.get("/workspace/tasks", requirePermission("VIEW_ASSIGNED_TASKS"), async (_req, res): Promise<void> => {
  const current = actor(res);
  const rows = await db.select({ task: tasksTable, caseTitle: casesTable.title }).from(tasksTable)
    .leftJoin(casesTable, and(eq(tasksTable.caseId, casesTable.id), eq(casesTable.assigneeId, current.id)))
    .where(eq(tasksTable.assigneeId, current.id)).orderBy(asc(tasksTable.dueAt));
  res.json({ tasks: rows.map(row => ({ ...row.task, caseTitle: row.caseTitle })) });
});
router.post("/workspace/tasks", requirePermission("MANAGE_ASSIGNED_TASKS"), async (req, res): Promise<void> => {
  const body = z.object({ caseId: idSchema.optional(), title: textSchema.max(300), description: z.string().max(5000).optional(), priority: z.enum(["low", "normal", "high", "urgent"]).optional(), dueAt: z.coerce.date().nullable().optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid task" }); return; } const current = actor(res);
  if (body.data.caseId) { const [workspaceCase] = await db.select().from(casesTable).where(and(eq(casesTable.id, body.data.caseId), eq(casesTable.assigneeId, current.id))); if (!workspaceCase) { res.status(404).json({ error: "Case not found" }); return; } }
  const [task] = await db.insert(tasksTable).values({ ...body.data, assigneeId: current.id }).returning(); res.status(201).json({ task });
});
router.patch("/workspace/tasks/:id", requirePermission("MANAGE_ASSIGNED_TASKS"), async (req, res): Promise<void> => {
  const parsedId = idSchema.safeParse(req.params.id); const body = taskUpdateSchema.safeParse(req.body);
  if (!parsedId.success || !body.success) { res.status(400).json({ error: "Invalid task update" }); return; }
  const current = actor(res);
  const [updated] = await db.update(tasksTable).set({ status: body.data.status, comment: body.data.comment, updatedAt: new Date() }).where(and(eq(tasksTable.id, parsedId.data), eq(tasksTable.assigneeId, current.id))).returning();
  if (!updated) { res.status(404).json({ error: "Task not found" }); return; }
  await addActivity(current, "task", updated.id, "updated", body.data.comment ? { comment: body.data.comment } : {});
  res.json({ task: updated });
});

async function visibleDocuments(collaboratorId: number, caseId?: number) {
  const own = await db.select().from(documentsTable).where(and(
    eq(documentsTable.uploadedById, collaboratorId),
    caseId === undefined ? undefined : eq(documentsTable.caseId, caseId),
  )).orderBy(desc(documentsTable.createdAt));
  const assigned = await db.select({ document: documentsTable, assignmentId: documentAssignmentsTable.id })
    .from(documentAssignmentsTable).innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id))
    .where(and(eq(documentAssignmentsTable.collaboratorId, collaboratorId),
      caseId === undefined ? undefined : eq(documentsTable.caseId, caseId))).orderBy(desc(documentsTable.createdAt));
  const result = new Map(own.map(document => [document.id, {
    ...document, assignmentId: null as number | null,
    downloadPath: document.assetId ? `/workspace/documents/${document.id}/file` : null as string | null,
  }]));
  for (const { document, assignmentId } of assigned) {
    result.set(document.id, { ...document, assignmentId,
      downloadPath: document.assetId ? `/workspace/documents/received/${assignmentId}/file` : null });
  }
  return [...result.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

router.get("/workspace/documents", requirePermission("VIEW_ASSIGNED_DOCUMENTS"), async (_req, res): Promise<void> => {
  res.json({ documents: await visibleDocuments(actor(res).id) });
});
router.get("/workspace/documents/:id/file", requirePermission("VIEW_ASSIGNED_DOCUMENTS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid document id" }); return; }
  const [document] = await db.select().from(documentsTable)
    .where(and(eq(documentsTable.id, id.data), eq(documentsTable.uploadedById, actor(res).id))).limit(1);
  const asset = document?.assetId ? await getConsumedAsset(document.assetId, "document") : undefined;
  if (!asset) { res.status(404).json({ error: "Document attachment not found" }); return; }
  const url = await createDownloadUrl(asset);
  if (!url) { req.log.warn("Private document signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn: 300 });
});
router.get("/workspace/notifications", async (_req, res): Promise<void> => { const current = actor(res); res.json({ notifications: await db.select().from(notificationsTable).where(eq(notificationsTable.collaboratorId, current.id)).orderBy(desc(notificationsTable.createdAt)) }); });
router.patch("/workspace/notifications/:id/read", requireWorkspaceWrite, async (req, res): Promise<void> => {
  const parsed = idSchema.safeParse(req.params.id); if (!parsed.success) { res.status(400).json({ error: "Invalid notification id" }); return; }
  const current = actor(res); const [notification] = await db.update(notificationsTable).set({ isRead: true, updatedAt: new Date() }).where(and(eq(notificationsTable.id, parsed.data), eq(notificationsTable.collaboratorId, current.id))).returning();
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; } res.json({ notification });
});
router.patch("/workspace/notifications/read-all", requireWorkspaceWrite, async (_req, res): Promise<void> => {
  const current = actor(res);
  await db.update(notificationsTable).set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notificationsTable.collaboratorId, current.id), eq(notificationsTable.isRead, false)));
  res.json({ updated: true });
});
router.get("/workspace/activity", async (_req, res): Promise<void> => { const current = actor(res); res.json({ activity: await db.select().from(activityLogsTable).where(eq(activityLogsTable.collaboratorId, current.id)).orderBy(desc(activityLogsTable.createdAt)).limit(100) }); });
router.get("/workspace/video-access", async (_req, res): Promise<void> => {
  const current = actor(res); const now = new Date();
  if (!current.permissions.includes("CAN_USE_VIDEO_CONFERENCE")) {
    res.json(GetWorkspaceVideoAccessResponse.parse({
      authorized: false, allowed: false, meetings: [], meeting: null, reason: "Permission CAN_USE_VIDEO_CONFERENCE requise.",
    }));
    return;
  }
  const authorizations = await db.select().from(videoAuthorizationsTable).where(and(
    eq(videoAuthorizationsTable.collaboratorId, current.id),
    eq(videoAuthorizationsTable.isRevoked, false),
    lte(videoAuthorizationsTable.startsAt, now),
    gte(videoAuthorizationsTable.expiresAt, now),
  )).orderBy(asc(videoAuthorizationsTable.startsAt));
  const meetings = authorizations.map(authorization => ({
    id: authorization.id,
    title: authorization.meetingTitle,
    url: authorization.meetingUrl,
    startsAt: authorization.startsAt,
    expiresAt: authorization.expiresAt,
  }));
  res.json(GetWorkspaceVideoAccessResponse.parse({
    authorized: meetings.length > 0,
    allowed: meetings.length > 0,
    meetings,
    meeting: meetings[0] ?? null,
    ...(meetings.length ? {} : { reason: "No active video authorization for this account." }),
  }));
});
router.get("/workspace/me/permissions", (_req, res): void => {
  const permissions = actor(res).permissions;
  res.json({ permissions, videoEnabled: permissions.includes("CAN_USE_VIDEO_CONFERENCE") });
});
router.get("/workspace/documents/received", requirePermission("VIEW_ASSIGNED_DOCUMENTS"), async (_req, res): Promise<void> => {
  const current = actor(res);
  const documents = await db.select({ assignment: documentAssignmentsTable, document: documentsTable }).from(documentAssignmentsTable)
    .innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id))
    .where(eq(documentAssignmentsTable.collaboratorId, current.id)).orderBy(desc(documentAssignmentsTable.updatedAt));
  res.json({ documents });
});
router.get("/workspace/documents/received/:id/file", requirePermission("VIEW_ASSIGNED_DOCUMENTS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid assignment id" }); return; }
  const current = actor(res);
  const [row] = await db.select({ document: documentsTable }).from(documentAssignmentsTable)
    .innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id))
    .where(and(eq(documentAssignmentsTable.id, id.data), eq(documentAssignmentsTable.collaboratorId, current.id))).limit(1);
  if (!row?.document.assetId) { res.status(404).json({ error: "Document attachment not found" }); return; }
  const asset = await getConsumedAsset(row.document.assetId, "document");
  if (!asset) { res.status(404).json({ error: "Document attachment not found" }); return; }
  const url = await createDownloadUrl(asset);
  if (!url) { req.log.warn("Private received document signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn: 300 });
});
router.patch("/workspace/documents/received/:id", requirePermission("SUBMIT_DOCUMENTS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id), body = assignmentSchema.safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid document assignment" }); return; }
  const current = actor(res); const [assignment] = await db.update(documentAssignmentsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(documentAssignmentsTable.id, id.data), eq(documentAssignmentsTable.collaboratorId, current.id))).returning();
  if (!assignment) { res.status(404).json({ error: "Document assignment not found" }); return; } await addActivity(current, "document_assignment", assignment.id, "updated"); res.json({ assignment });
});
router.get("/workspace/requests", requirePermission("VIEW_EXECUTIVE_REQUESTS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ requests: await db.select().from(executiveRequestsTable).where(eq(executiveRequestsTable.assigneeId, current.id)).orderBy(desc(executiveRequestsTable.updatedAt)) }); });
router.post("/workspace/requests", requirePermission("MANAGE_ASSIGNED_REQUESTS"), async (req, res): Promise<void> => {
  const body = requestSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; } const current = actor(res);
  const [request] = await db.insert(executiveRequestsTable).values({ ...body.data, assigneeId: current.id }).returning(); await notifyActiveAdmins("New request", `${current.fullName} submitted a request: ${request.title}`); await addActivity(current, "executive_request", request.id, "created"); res.status(201).json({ request });
});
router.patch("/workspace/requests/:id", requirePermission("MANAGE_ASSIGNED_REQUESTS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id), body = requestSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid request update" }); return; } const current = actor(res);
  const [request] = await db.update(executiveRequestsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(executiveRequestsTable.id, id.data), eq(executiveRequestsTable.assigneeId, current.id))).returning(); if (!request) { res.status(404).json({ error: "Request not found" }); return; } res.json({ request });
});
router.get("/workspace/meetings", requirePermission("PARTICIPATE_IN_MEETINGS"), async (_req, res): Promise<void> => {
  const current = actor(res);
  const rows = await db.select({ meeting: meetingsTable, video: { fileName: privateUploadsTable.fileName, contentType: privateUploadsTable.contentType } })
    .from(meetingParticipantsTable).innerJoin(meetingsTable, eq(meetingParticipantsTable.meetingId, meetingsTable.id))
    .leftJoin(privateUploadsTable, eq(meetingsTable.videoAssetId, privateUploadsTable.id))
    .where(eq(meetingParticipantsTable.collaboratorId, current.id)).orderBy(asc(meetingsTable.startsAt));
  res.json({ meetings: rows.map(row => ({ ...row.meeting, videoFileName: row.video?.fileName ?? null, videoContentType: row.video?.contentType ?? null })) });
});
router.get("/workspace/meetings/:id/video", requirePermission("CAN_USE_VIDEO_CONFERENCE"), requirePermission("PARTICIPATE_IN_MEETINGS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid meeting id" }); return; }
  const current = actor(res);
  const [meeting] = await db.select({ meeting: meetingsTable }).from(meetingParticipantsTable)
    .innerJoin(meetingsTable, eq(meetingParticipantsTable.meetingId, meetingsTable.id))
    .where(and(eq(meetingParticipantsTable.meetingId, id.data), eq(meetingParticipantsTable.collaboratorId, current.id))).limit(1);
  if (!meeting?.meeting.videoAssetId) { res.status(404).json({ error: "Meeting video not found" }); return; }
  const validUntil = meeting.meeting.endsAt ?? new Date(meeting.meeting.startsAt.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now < meeting.meeting.startsAt) { res.status(403).json({ error: "Meeting video is outside its scheduled viewing window" }); return; }
  const expiresIn = videoSigningExpirySeconds(validUntil, now);
  if (expiresIn === undefined) { res.status(403).json({ error: "Meeting video is outside its scheduled viewing window" }); return; }
  const asset = await getConsumedAsset(meeting.meeting.videoAssetId, "meeting-video");
  if (!asset) { res.status(404).json({ error: "Meeting video not found" }); return; }
  const url = await createDownloadUrl(asset, expiresIn);
  if (!url) { req.log.warn("Private meeting video signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn });
});
router.get("/workspace/conversations", requirePermission("USE_INTERNAL_MESSAGING"), async (_req, res): Promise<void> => {
  const current = actor(res);
  res.json({ conversations: await db.select().from(conversationsTable).where(eq(conversationsTable.collaboratorId, current.id)).orderBy(desc(conversationsTable.updatedAt)) });
});
router.post("/workspace/conversations", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const body = z.object({ subject: textSchema.max(300), initialMessage: z.string().trim().min(1).max(10000).optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid conversation" }); return; }
  const current = actor(res);
  const conversation = await db.transaction(async tx => {
    const [created] = await tx.insert(conversationsTable).values({ subject: body.data.subject, collaboratorId: current.id }).returning();
    if (body.data.initialMessage) await tx.insert(messagesTable).values({ conversationId: created.id, senderId: current.id, body: body.data.initialMessage });
    const admins = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
    if (admins.length) await tx.insert(notificationsTable).values(admins.map(admin => ({
      collaboratorId: admin.id, title: "New message", body: `${current.fullName} started a conversation: ${created.subject}`,
    })));
    return created;
  });
  res.status(201).json({ conversation });
});
router.get("/workspace/conversations/:id/messages", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid conversation id" }); return; }
  const current = actor(res);
  const [conversation] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id.data), eq(conversationsTable.collaboratorId, current.id)));
  if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }
  const rows = await db.select({ message: messagesTable, audio: { fileName: privateUploadsTable.fileName, contentType: privateUploadsTable.contentType } })
    .from(messagesTable).leftJoin(privateUploadsTable, eq(messagesTable.audioAssetId, privateUploadsTable.id))
    .where(eq(messagesTable.conversationId, id.data)).orderBy(asc(messagesTable.createdAt));
  res.json({ messages: rows.map(row => ({ ...row.message, audioFileName: row.audio ? (row.message.senderId === current.id ? row.audio.fileName : row.message.senderServiceName || "La direction") : null, audioContentType: row.audio?.contentType ?? null })) });
});
router.post("/workspace/conversations/:id/messages", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id), body = threadMessageSchema.safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid message" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [conversation] = await tx.select().from(conversationsTable)
      .where(and(eq(conversationsTable.id, id.data), eq(conversationsTable.collaboratorId, current.id)))
      .for("update").limit(1);
    if (!conversation) return { error: "Conversation not found" as const };
    let audio: Awaited<ReturnType<typeof consumeUpload>> = undefined;
    if (body.data.audioAssetId) {
      audio = await consumeUpload(tx, body.data.audioAssetId, current.id, "audio", "message-audio");
      if (!audio) return { uploadError: true as const };
    }
    const [message] = await tx.insert(messagesTable).values({
      conversationId: id.data, senderId: current.id, body: body.data.body ?? "",
      audioAssetId: audio?.id ?? null, transcript: body.data.transcript ?? null,
      translation: body.data.translation ?? null, sourceLanguage: body.data.sourceLanguage ?? null,
      targetLanguage: body.data.targetLanguage ?? null,
    }).returning();
    await tx.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, id.data));
    const admins = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
    if (admins.length) await tx.insert(notificationsTable).values(admins.map(admin => ({
      collaboratorId: admin.id, title: "New message", body: `${current.fullName} replied to: ${conversation.subject}`,
    })));
    return { message: { ...message, audioFileName: audio?.fileName ?? null, audioContentType: audio?.contentType ?? null } };
  });
  if ("error" in result) { res.status(404).json({ error: result.error }); return; }
  if ("uploadError" in result) { res.status(400).json({ error: "Audio must be a completed audio upload owned by this collaborator" }); return; }
  res.status(201).json(result);
});
router.get("/workspace/conversations/:id/messages/:messageId/file", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id), messageId = idSchema.safeParse(req.params.messageId);
  if (!id.success || !messageId.success) { res.status(400).json({ error: "Invalid message id" }); return; }
  const current = actor(res);
  const [row] = await db.select({ message: messagesTable }).from(messagesTable)
    .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
    .where(and(eq(messagesTable.id, messageId.data), eq(messagesTable.conversationId, id.data), eq(conversationsTable.collaboratorId, current.id))).limit(1);
  if (!row?.message.audioAssetId) { res.status(404).json({ error: "Audio message not found" }); return; }
  const asset = await getConsumedAsset(row.message.audioAssetId, "message-audio");
  if (!asset) { res.status(404).json({ error: "Audio message not found" }); return; }
  const receivedFromDirection = row.message.senderId !== current.id;
  const serviceName = row.message.senderServiceName || "La direction";
  const url = await createDownloadUrl(asset, 300, receivedFromDirection ? serviceAudioDownloadName(serviceName, asset.fileName) : undefined);
  if (!url) { req.log.warn("Private message audio signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: receivedFromDirection ? serviceName : asset.fileName, contentType: asset.contentType, expiresIn: 300 });
});
router.get("/workspace/notes", async (_req, res): Promise<void> => { const current = actor(res); res.json({ notes: await db.select().from(strategicNotesTable).where(or(eq(strategicNotesTable.collaboratorId, current.id), eq(strategicNotesTable.isShared, true))).orderBy(desc(strategicNotesTable.updatedAt)) }); });
router.post("/workspace/notes", requireWorkspaceWrite, async (req, res): Promise<void> => { const body = noteSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid note" }); return; } const current = actor(res); const [note] = await db.insert(strategicNotesTable).values({ ...body.data, collaboratorId: current.id }).returning(); res.status(201).json({ note }); });
router.patch("/workspace/notes/:id", requireWorkspaceWrite, async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = noteSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid note update" }); return; } const current = actor(res); const [note] = await db.update(strategicNotesTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(strategicNotesTable.id, id.data), eq(strategicNotesTable.collaboratorId, current.id))).returning(); if (!note) { res.status(404).json({ error: "Note not found" }); return; } res.json({ note }); });
router.get("/workspace/contacts", async (_req, res): Promise<void> => { const current = actor(res); res.json({ contacts: await db.select().from(contactsTable).where(or(eq(contactsTable.collaboratorId, current.id), sql`${contactsTable.collaboratorId} IS NULL`)).orderBy(asc(contactsTable.fullName)) }); });
router.get("/workspace/me/financial-summary", requirePermission("VIEW_OWN_FINANCIAL_INFORMATION"), async (_req, res): Promise<void> => { const current = actor(res); const [summary] = await db.select().from(financialRecordsTable).where(eq(financialRecordsTable.collaboratorId, current.id)).orderBy(desc(financialRecordsTable.updatedAt)).limit(1); res.json(GetWorkspaceFinancialSummaryResponse.parse({ summary: summary ?? null })); });
router.get("/workspace/me/payments", requirePermission("VIEW_OWN_PAYMENT_HISTORY"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ payments: await db.select().from(paymentsTable).where(eq(paymentsTable.collaboratorId, current.id)).orderBy(desc(paymentsTable.createdAt)) }); });
router.get("/workspace/me/arrears", requirePermission("VIEW_OWN_ARREARS"), async (_req, res): Promise<void> => {
  const current = actor(res);
  const arrears = await db.select().from(arrearsTable)
    .where(eq(arrearsTable.collaboratorId, current.id)).orderBy(desc(arrearsTable.createdAt));
  res.json(ListCollaboratorArrearsResponse.parse({ arrears }));
});
router.post("/workspace/me/salary-records/:id/transfer-request", requirePermission("VIEW_OWN_FINANCIAL_INFORMATION"), async (req, res): Promise<void> => {
  const params = RequestSalaryTransferParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid salary record id" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [record] = await tx.select().from(financialRecordsTable).where(and(
      eq(financialRecordsTable.id, params.data.id), eq(financialRecordsTable.collaboratorId, current.id),
    )).for("update").limit(1);
    if (!record) return { error: "Salary record not found", status: 404 };
    // Retry-safe: a timeout must not create a second request or duplicate notifications.
    if (record.transferRequestedAt || record.transferRequestStatus) return { salaryRecord: record, existing: true };
    if (["paid", "sent", "versé"].includes(record.salaryStatus.trim().toLowerCase())) {
      return { error: "A paid salary cannot receive a transfer request", status: 409 };
    }
    const [salaryRecord] = await tx.update(financialRecordsTable).set({
      transferRequestedAt: new Date(), transferRequestStatus: "pending", updatedAt: new Date(),
    }).where(eq(financialRecordsTable.id, record.id)).returning();
    const admins = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
    if (admins.length) await tx.insert(notificationsTable).values(admins.map(admin => ({
      collaboratorId: admin.id, title: "Demande de transfert de salaire reçue",
      body: `${current.fullName} a demandé une procédure pour ${record.periodLabel}. Aucun paiement n’a été déclenché.`,
    })));
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "salary-record", entityId: record.id,
      action: "transfer_requested", details: { periodLabel: record.periodLabel },
    });
    return { salaryRecord, existing: false };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.status(result.existing ? 200 : 201).json(RequestSalaryTransferResponse.parse({ salaryRecord: result.salaryRecord }));
});
router.post("/workspace/me/arrears/:id/transfer-request", requirePermission("VIEW_OWN_ARREARS"), async (req, res): Promise<void> => {
  const params = RequestArrearTransferParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid arrear id" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [arrear] = await tx.select().from(arrearsTable).where(and(
      eq(arrearsTable.id, params.data.id),
      eq(arrearsTable.collaboratorId, current.id),
    )).for("update").limit(1);
    if (!arrear) return { error: "Arrear not found", status: 404 };
    if (arrear.transferRequestedAt || arrear.transferRequestStatus) {
      return { arrear, existing: true };
    }
    if (arrear.status === "settled" || arrear.status === "archived") {
      return { error: "A resolved arrear cannot receive a transfer request", status: 409 };
    }
    const now = new Date();
    const [updated] = await tx.update(arrearsTable).set({
      transferRequestedAt: now,
      transferRequestStatus: "pending",
      updatedAt: now,
    }).where(and(
      eq(arrearsTable.id, arrear.id),
      eq(arrearsTable.collaboratorId, current.id),
    )).returning();
    const admins = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
    if (admins.length) {
      await tx.insert(notificationsTable).values(admins.map(admin => ({
        collaboratorId: admin.id,
        title: "Demande de régularisation reçue",
        body: `${current.fullName} a demandé une régularisation pour la période ${arrear.periodLabel}.`,
      })));
    }
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "arrear",
      entityId: arrear.id,
      action: "transfer_requested",
      details: { periodLabel: arrear.periodLabel },
    });
    return { arrear: updated, existing: false };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.status(result.existing ? 200 : 201).json(RequestArrearTransferResponse.parse({ arrear: result.arrear }));
});
const requirementSchema = z.object({ title: textSchema.max(300), details: z.string().max(5000).optional(), status: z.enum(["pending", "submitted", "accepted", "rejected"]).optional() });
router.get("/workspace/me/payment-requirements", requirePermission("VIEW_OWN_PAYMENT_REQUIREMENTS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ requirements: await db.select().from(paymentRequirementsTable).where(eq(paymentRequirementsTable.collaboratorId, current.id)).orderBy(desc(paymentRequirementsTable.updatedAt)) }); });
router.post("/workspace/me/payment-requirements", requirePermission("SUBMIT_PAYMENT_DOCUMENTS"), async (req, res): Promise<void> => { const body = requirementSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid payment requirement" }); return; } const current = actor(res); const [requirement] = await db.insert(paymentRequirementsTable).values({ ...body.data, collaboratorId: current.id }).returning(); res.status(201).json({ requirement }); });
router.patch("/workspace/me/payment-requirements/:id", requirePermission("SUBMIT_PAYMENT_DOCUMENTS"), async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = requirementSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid payment requirement update" }); return; } const current = actor(res); const [requirement] = await db.update(paymentRequirementsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(paymentRequirementsTable.id, id.data), eq(paymentRequirementsTable.collaboratorId, current.id))).returning(); if (!requirement) { res.status(404).json({ error: "Requirement not found" }); return; } res.json({ requirement }); });
router.post("/workspace/me/payment-requirements/:id/documents", requirePermission("SUBMIT_PAYMENT_DOCUMENTS"), async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = z.object({ title: textSchema.max(300), contentType: z.string().max(255).optional(), objectPath: z.string().max(2000).optional() }).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid document metadata" }); return; } const current = actor(res); const [requirement] = await db.select().from(paymentRequirementsTable).where(and(eq(paymentRequirementsTable.id, id.data), eq(paymentRequirementsTable.collaboratorId, current.id))); if (!requirement) { res.status(404).json({ error: "Requirement not found" }); return; } if (!body.data.objectPath) { res.status(501).json({ error: "Private document byte uploads are not enabled; no document was submitted." }); return; } const [document] = await db.insert(paymentRequirementDocumentsTable).values({ ...body.data, requirementId: requirement.id, submittedById: current.id }).returning(); res.status(201).json({ document }); });
router.get("/workspace/sessions", async (req, res): Promise<void> => {
  const current = actor(res);
  const token = req.cookies?.somiren_collaborator_session;
  const crypto = await import("node:crypto");
  const currentHash = typeof token === "string" ? crypto.createHash("sha256").update(token).digest("hex") : "";
  const sessions = await db.select({
    id: collaboratorSessionsTable.id,
    expiresAt: collaboratorSessionsTable.expiresAt,
    lastActiveAt: collaboratorSessionsTable.lastActiveAt,
    createdAt: collaboratorSessionsTable.createdAt,
    browserName: collaboratorSessionsTable.browserName,
    osName: collaboratorSessionsTable.osName,
    current: sql<boolean>`${collaboratorSessionsTable.tokenHash} = ${currentHash}`,
  }).from(collaboratorSessionsTable).where(eq(collaboratorSessionsTable.collaboratorId, current.id));
  res.json(ListWorkspaceSessionsResponse.parse({
    sessions: sessions.map((session) => ({
      ...session,
      device: readableSessionDevice(session.browserName, session.osName),
    })),
  }));
});
router.delete("/workspace/sessions/:id", async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id); if (!id.success) { res.status(400).json({ error: "Invalid session id" }); return; } const current = actor(res); const deleted = await db.delete(collaboratorSessionsTable).where(and(eq(collaboratorSessionsTable.id, id.data), eq(collaboratorSessionsTable.collaboratorId, current.id))).returning({ id: collaboratorSessionsTable.id }); if (!deleted.length) { res.status(404).json({ error: "Session not found" }); return; } res.status(204).end(); });
router.get("/workspace/activity-log", async (_req, res): Promise<void> => { const current = actor(res); res.json({ activity: await db.select().from(activityLogsTable).where(eq(activityLogsTable.collaboratorId, current.id)).orderBy(desc(activityLogsTable.createdAt)).limit(100) }); });
router.post("/workspace/video/create", requirePermission("CAN_CREATE_VIDEO_CONFERENCE"), requirePermission("CAN_USE_VIDEO_CONFERENCE"), (_req, res): void => { res.status(501).json({ error: "Video conference provisioning is not configured." }); });
router.post("/workspace/video/join", requirePermission("CAN_USE_VIDEO_CONFERENCE"), async (req, res): Promise<void> => {
  const body = z.object({ authorizationId: idSchema }).strict().safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "A valid video authorization id is required" }); return; }
  const contractBody = JoinWorkspaceVideoMeetingBody.strict().safeParse(body.data);
  if (!contractBody.success) { res.status(400).json({ error: "A valid video authorization id is required" }); return; }
  const current = actor(res);
  const now = new Date();
  const authorization = await db.transaction(async tx => {
    const [active] = await tx.select().from(videoAuthorizationsTable).where(and(
      eq(videoAuthorizationsTable.id, body.data.authorizationId),
      eq(videoAuthorizationsTable.collaboratorId, current.id),
      eq(videoAuthorizationsTable.isRevoked, false),
      lte(videoAuthorizationsTable.startsAt, now),
      gte(videoAuthorizationsTable.expiresAt, now),
    )).for("update").limit(1);
    if (!active) return null;
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "video_authorization",
      entityId: active.id,
      action: "joined",
      details: { meetingTitle: active.meetingTitle },
    });
    return active;
  });
  if (!authorization) { res.status(403).json({ error: "This video authorization is expired, revoked, or not assigned to this account." }); return; }
  res.json(JoinWorkspaceVideoMeetingResponse.parse({
    meetingUrl: authorization.meetingUrl,
    authorizationId: authorization.id,
    expiresAt: authorization.expiresAt,
  }));
});

export default router;