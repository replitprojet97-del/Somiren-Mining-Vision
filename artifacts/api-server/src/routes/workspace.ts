import {
  activityLogsTable, arrearsTable, casesTable, collaboratorSessionsTable, collaboratorsTable, contactsTable,
  conversationsTable, db, documentAssignmentsTable, documentsTable, executiveRequestsTable, financialRecordsTable,
  meetingParticipantsTable, meetingsTable, messagesTable, notificationsTable, paymentRequirementDocumentsTable,
  paymentRequirementsTable, paymentsTable, strategicNotesTable, tasksTable, videoAuthorizationsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { getWorkspaceActor } from "./collaboratorAuth";

const router: IRouter = Router();
const idSchema = z.coerce.number().int().positive();
const caseUpdateSchema = z.object({
  status: z.enum(["active", "waiting", "completed", "on_hold"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
  comment: z.string().min(1).max(2000).optional(),
  clarificationRequest: z.string().min(1).max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one update is required");
const taskUpdateSchema = z.object({
  status: z.enum(["todo", "in_progress", "blocked", "completed"]).optional(),
  comment: z.string().min(1).max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one update is required");

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
const messageSchema = z.object({ body: textSchema.max(10000) });

router.use(requireWorkspaceAccess);

router.get("/workspace/me", (_req, res): void => {
  const current = actor(res);
  res.json({ profile: { id: current.id, email: current.email, fullName: current.fullName, role: current.role, department: "Direction Générale", employeeId: "SMR-DIR-001" }, permissions: current.permissions });
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
  const tasks = await db.select().from(tasksTable).where(and(eq(tasksTable.caseId, workspaceCase.id), eq(tasksTable.assigneeId, current.id)));
  const documents = await db.select().from(documentsTable).where(and(eq(documentsTable.caseId, workspaceCase.id), eq(documentsTable.uploadedById, current.id)));
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

router.get("/workspace/tasks", requirePermission("VIEW_ASSIGNED_TASKS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ tasks: await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, current.id)).orderBy(asc(tasksTable.dueAt)) }); });
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

router.get("/workspace/documents", requirePermission("VIEW_ASSIGNED_DOCUMENTS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ documents: await db.select().from(documentsTable).where(eq(documentsTable.uploadedById, current.id)).orderBy(desc(documentsTable.createdAt)) }); });
router.get("/workspace/notifications", async (_req, res): Promise<void> => { const current = actor(res); res.json({ notifications: await db.select().from(notificationsTable).where(eq(notificationsTable.collaboratorId, current.id)).orderBy(desc(notificationsTable.createdAt)) }); });
router.patch("/workspace/notifications/:id/read", requireWorkspaceWrite, async (req, res): Promise<void> => {
  const parsed = idSchema.safeParse(req.params.id); if (!parsed.success) { res.status(400).json({ error: "Invalid notification id" }); return; }
  const current = actor(res); const [notification] = await db.update(notificationsTable).set({ isRead: true, updatedAt: new Date() }).where(and(eq(notificationsTable.id, parsed.data), eq(notificationsTable.collaboratorId, current.id))).returning();
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; } res.json({ notification });
});
router.get("/workspace/activity", async (_req, res): Promise<void> => { const current = actor(res); res.json({ activity: await db.select().from(activityLogsTable).where(eq(activityLogsTable.collaboratorId, current.id)).orderBy(desc(activityLogsTable.createdAt)).limit(100) }); });
router.get("/workspace/video-access", async (_req, res): Promise<void> => {
  const current = actor(res); const now = new Date();
  if (!current.permissions.includes("CAN_USE_VIDEO_CONFERENCE")) { res.json({ authorized: false, allowed: false, reason: "Permission CAN_USE_VIDEO_CONFERENCE requise." }); return; }
  const [authorization] = await db.select().from(videoAuthorizationsTable).where(and(eq(videoAuthorizationsTable.collaboratorId, current.id), eq(videoAuthorizationsTable.isRevoked, false), lte(videoAuthorizationsTable.startsAt, now), gte(videoAuthorizationsTable.expiresAt, now))).limit(1);
  if (!authorization) { res.json({ authorized: false, allowed: false, reason: "No active video authorization for this account." }); return; }
  res.json({ authorized: true, allowed: true, meeting: { title: authorization.meetingTitle, url: authorization.meetingUrl, startsAt: authorization.startsAt, expiresAt: authorization.expiresAt } });
});
router.post("/storage/uploads/request-url", requireWorkspaceWrite, (_req, res): void => { res.status(501).json({ error: "Private document uploads are not enabled; no upload URL was created." }); });

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
router.patch("/workspace/documents/received/:id", requirePermission("SUBMIT_DOCUMENTS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id), body = assignmentSchema.safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid document assignment" }); return; }
  const current = actor(res); const [assignment] = await db.update(documentAssignmentsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(documentAssignmentsTable.id, id.data), eq(documentAssignmentsTable.collaboratorId, current.id))).returning();
  if (!assignment) { res.status(404).json({ error: "Document assignment not found" }); return; } await addActivity(current, "document_assignment", assignment.id, "updated"); res.json({ assignment });
});
router.get("/workspace/requests", requirePermission("VIEW_EXECUTIVE_REQUESTS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ requests: await db.select().from(executiveRequestsTable).where(eq(executiveRequestsTable.assigneeId, current.id)).orderBy(desc(executiveRequestsTable.updatedAt)) }); });
router.post("/workspace/requests", requirePermission("MANAGE_ASSIGNED_REQUESTS"), async (req, res): Promise<void> => {
  const body = requestSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; } const current = actor(res);
  const [request] = await db.insert(executiveRequestsTable).values({ ...body.data, assigneeId: current.id }).returning(); await addActivity(current, "executive_request", request.id, "created"); res.status(201).json({ request });
});
router.patch("/workspace/requests/:id", requirePermission("MANAGE_ASSIGNED_REQUESTS"), async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id), body = requestSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid request update" }); return; } const current = actor(res);
  const [request] = await db.update(executiveRequestsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(executiveRequestsTable.id, id.data), eq(executiveRequestsTable.assigneeId, current.id))).returning(); if (!request) { res.status(404).json({ error: "Request not found" }); return; } res.json({ request });
});
router.get("/workspace/meetings", requirePermission("PARTICIPATE_IN_MEETINGS"), async (_req, res): Promise<void> => { const current = actor(res); const meetings = await db.select({ meeting: meetingsTable }).from(meetingParticipantsTable).innerJoin(meetingsTable, eq(meetingParticipantsTable.meetingId, meetingsTable.id)).where(eq(meetingParticipantsTable.collaboratorId, current.id)).orderBy(asc(meetingsTable.startsAt)); res.json({ meetings: meetings.map(v => v.meeting) }); });
router.get("/workspace/conversations", requirePermission("USE_INTERNAL_MESSAGING"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ conversations: await db.select().from(conversationsTable).where(eq(conversationsTable.collaboratorId, current.id)).orderBy(desc(conversationsTable.updatedAt)) }); });
router.post("/workspace/conversations", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => { const body = z.object({ subject: textSchema.max(300), initialMessage: z.string().max(10000).optional() }).safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid conversation" }); return; } const current = actor(res); const [conversation] = await db.insert(conversationsTable).values({ subject: body.data.subject, collaboratorId: current.id }).returning(); if (body.data.initialMessage) await db.insert(messagesTable).values({ conversationId: conversation.id, senderId: current.id, body: body.data.initialMessage }); res.status(201).json({ conversation }); });
router.get("/workspace/conversations/:id/messages", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id); if (!id.success) { res.status(400).json({ error: "Invalid conversation id" }); return; } const current = actor(res); const [conversation] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id.data), eq(conversationsTable.collaboratorId, current.id))); if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; } res.json({ messages: await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversation.id)).orderBy(asc(messagesTable.createdAt)) }); });
router.post("/workspace/conversations/:id/messages", requirePermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = messageSchema.safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid message" }); return; } const current = actor(res); const [conversation] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, id.data), eq(conversationsTable.collaboratorId, current.id))); if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; } const [message] = await db.insert(messagesTable).values({ conversationId: id.data, senderId: current.id, body: body.data.body }).returning(); res.status(201).json({ message }); });
router.get("/workspace/notes", async (_req, res): Promise<void> => { const current = actor(res); res.json({ notes: await db.select().from(strategicNotesTable).where(or(eq(strategicNotesTable.collaboratorId, current.id), eq(strategicNotesTable.isShared, true))).orderBy(desc(strategicNotesTable.updatedAt)) }); });
router.post("/workspace/notes", requireWorkspaceWrite, async (req, res): Promise<void> => { const body = noteSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid note" }); return; } const current = actor(res); const [note] = await db.insert(strategicNotesTable).values({ ...body.data, collaboratorId: current.id }).returning(); res.status(201).json({ note }); });
router.patch("/workspace/notes/:id", requireWorkspaceWrite, async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = noteSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid note update" }); return; } const current = actor(res); const [note] = await db.update(strategicNotesTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(strategicNotesTable.id, id.data), eq(strategicNotesTable.collaboratorId, current.id))).returning(); if (!note) { res.status(404).json({ error: "Note not found" }); return; } res.json({ note }); });
router.get("/workspace/contacts", async (_req, res): Promise<void> => { const current = actor(res); res.json({ contacts: await db.select().from(contactsTable).where(or(eq(contactsTable.collaboratorId, current.id), sql`${contactsTable.collaboratorId} IS NULL`)).orderBy(asc(contactsTable.fullName)) }); });
router.get("/workspace/me/financial-summary", requirePermission("VIEW_OWN_FINANCIAL_INFORMATION"), async (_req, res): Promise<void> => { const current = actor(res); const [summary] = await db.select().from(financialRecordsTable).where(eq(financialRecordsTable.collaboratorId, current.id)).orderBy(desc(financialRecordsTable.updatedAt)).limit(1); res.json({ summary: summary ?? null }); });
router.get("/workspace/me/payments", requirePermission("VIEW_OWN_PAYMENT_HISTORY"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ payments: await db.select().from(paymentsTable).where(eq(paymentsTable.collaboratorId, current.id)).orderBy(desc(paymentsTable.createdAt)) }); });
router.get("/workspace/me/arrears", requirePermission("VIEW_OWN_ARREARS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ arrears: await db.select().from(arrearsTable).where(eq(arrearsTable.collaboratorId, current.id)).orderBy(desc(arrearsTable.createdAt)) }); });
const requirementSchema = z.object({ title: textSchema.max(300), details: z.string().max(5000).optional(), status: z.enum(["pending", "submitted", "accepted", "rejected"]).optional() });
router.get("/workspace/me/payment-requirements", requirePermission("VIEW_OWN_PAYMENT_REQUIREMENTS"), async (_req, res): Promise<void> => { const current = actor(res); res.json({ requirements: await db.select().from(paymentRequirementsTable).where(eq(paymentRequirementsTable.collaboratorId, current.id)).orderBy(desc(paymentRequirementsTable.updatedAt)) }); });
router.post("/workspace/me/payment-requirements", requirePermission("SUBMIT_PAYMENT_DOCUMENTS"), async (req, res): Promise<void> => { const body = requirementSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid payment requirement" }); return; } const current = actor(res); const [requirement] = await db.insert(paymentRequirementsTable).values({ ...body.data, collaboratorId: current.id }).returning(); res.status(201).json({ requirement }); });
router.patch("/workspace/me/payment-requirements/:id", requirePermission("SUBMIT_PAYMENT_DOCUMENTS"), async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = requirementSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid payment requirement update" }); return; } const current = actor(res); const [requirement] = await db.update(paymentRequirementsTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(paymentRequirementsTable.id, id.data), eq(paymentRequirementsTable.collaboratorId, current.id))).returning(); if (!requirement) { res.status(404).json({ error: "Requirement not found" }); return; } res.json({ requirement }); });
router.post("/workspace/me/payment-requirements/:id/documents", requirePermission("SUBMIT_PAYMENT_DOCUMENTS"), async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id), body = z.object({ title: textSchema.max(300), contentType: z.string().max(255).optional(), objectPath: z.string().max(2000).optional() }).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid document metadata" }); return; } const current = actor(res); const [requirement] = await db.select().from(paymentRequirementsTable).where(and(eq(paymentRequirementsTable.id, id.data), eq(paymentRequirementsTable.collaboratorId, current.id))); if (!requirement) { res.status(404).json({ error: "Requirement not found" }); return; } if (!body.data.objectPath) { res.status(501).json({ error: "Private document byte uploads are not enabled; no document was submitted." }); return; } const [document] = await db.insert(paymentRequirementDocumentsTable).values({ ...body.data, requirementId: requirement.id, submittedById: current.id }).returning(); res.status(201).json({ document }); });
router.get("/workspace/sessions", async (req, res): Promise<void> => { const current = actor(res); const token = req.cookies?.somiren_collaborator_session; const crypto = await import("node:crypto"); const currentHash = typeof token === "string" ? crypto.createHash("sha256").update(token).digest("hex") : ""; const sessions = await db.select({ id: collaboratorSessionsTable.id, expiresAt: collaboratorSessionsTable.expiresAt, lastActiveAt: collaboratorSessionsTable.lastActiveAt, createdAt: collaboratorSessionsTable.createdAt, tokenHash: collaboratorSessionsTable.tokenHash }).from(collaboratorSessionsTable).where(eq(collaboratorSessionsTable.collaboratorId, current.id)); res.json({ sessions: sessions.map(({ tokenHash, ...session }) => ({ ...session, current: tokenHash === currentHash })) }); });
router.delete("/workspace/sessions/:id", async (req, res): Promise<void> => { const id = idSchema.safeParse(req.params.id); if (!id.success) { res.status(400).json({ error: "Invalid session id" }); return; } const current = actor(res); const deleted = await db.delete(collaboratorSessionsTable).where(and(eq(collaboratorSessionsTable.id, id.data), eq(collaboratorSessionsTable.collaboratorId, current.id))).returning({ id: collaboratorSessionsTable.id }); if (!deleted.length) { res.status(404).json({ error: "Session not found" }); return; } res.status(204).end(); });
router.get("/workspace/activity-log", async (_req, res): Promise<void> => { const current = actor(res); res.json({ activity: await db.select().from(activityLogsTable).where(eq(activityLogsTable.collaboratorId, current.id)).orderBy(desc(activityLogsTable.createdAt)).limit(100) }); });
router.post("/workspace/video/create", requirePermission("CAN_CREATE_VIDEO_CONFERENCE"), requirePermission("CAN_USE_VIDEO_CONFERENCE"), (_req, res): void => { res.status(501).json({ error: "Video conference provisioning is not configured." }); });
router.post("/workspace/video/join", requirePermission("CAN_USE_VIDEO_CONFERENCE"), async (_req, res): Promise<void> => { const current = actor(res); const now = new Date(); const [authorization] = await db.select().from(videoAuthorizationsTable).where(and(eq(videoAuthorizationsTable.collaboratorId, current.id), eq(videoAuthorizationsTable.isRevoked, false), lte(videoAuthorizationsTable.startsAt, now), gte(videoAuthorizationsTable.expiresAt, now))).limit(1); if (!authorization) { res.status(403).json({ error: "No active video authorization." }); return; } res.json({ meetingUrl: authorization.meetingUrl, expiresAt: authorization.expiresAt }); });

export default router;