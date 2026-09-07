import {
  activityLogsTable, casesTable, collaboratorSessionsTable, collaboratorsTable, db,
  documentAssignmentsTable, documentsTable, executiveRequestsTable, meetingParticipantsTable,
  meetingsTable, shipmentsTable, workspaceRolesTable,
} from "@workspace/db";
import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createCollaboratorSession, getWorkspaceActor, hashCollaboratorPassword } from "./collaboratorAuth";

const router: IRouter = Router();
const idSchema = z.coerce.number().int().positive();
const permissions = [
  "workspace:read", "workspace:write", "MANAGE_USERS", "MANAGE_PERMISSIONS",
  "VIEW_ASSIGNED_CASES", "MANAGE_ASSIGNED_CASES", "VIEW_ASSIGNED_TASKS", "MANAGE_ASSIGNED_TASKS",
  "VIEW_EXECUTIVE_REQUESTS", "MANAGE_ASSIGNED_REQUESTS", "VIEW_ASSIGNED_DOCUMENTS", "SUBMIT_DOCUMENTS",
  "DOWNLOAD_ALLOWED_DOCUMENTS", "UPLOAD_DOCUMENTS", "USE_INTERNAL_MESSAGING", "PARTICIPATE_IN_MEETINGS",
  "CAN_USE_VIDEO_CONFERENCE", "CAN_CREATE_VIDEO_CONFERENCE", "VIEW_OWN_FINANCIAL_INFORMATION",
  "VIEW_OWN_PAYMENT_HISTORY", "VIEW_OWN_ARREARS", "VIEW_OWN_PAYMENT_REQUIREMENTS", "SUBMIT_PAYMENT_DOCUMENTS",
] as const;
const permissionSchema = z.array(z.enum(permissions)).max(64).transform((v) => [...new Set(v)]);
const roleSchema = z.enum(["ADMIN", "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR", "COLLABORATOR"]);
const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
type Actor = typeof collaboratorsTable.$inferSelect;

function actor(res: Response): Actor { return res.locals.adminActor as Actor; }
export async function requireAdminAccess(req: Request, res: Response, next: () => void): Promise<void> {
  try {
    const current = await getWorkspaceActor(req);
    if (!current) { res.status(401).json({ error: "Authentication required" }); return; }
    if (current.role !== "ADMIN" && !current.permissions.includes("MANAGE_USERS") && !current.permissions.includes("MANAGE_PERMISSIONS")) {
      res.status(403).json({ error: "Administration access required" }); return;
    }
    res.locals.adminActor = current;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Admin authorization failed");
    res.status(503).json({ error: "Administration authorization is temporarily unavailable" });
  }
}
export async function addAdminActivity(current: Actor, entityType: string, entityId: number | null, action: string, details: Record<string, unknown> = {}): Promise<void> {
  await db.insert(activityLogsTable).values({ collaboratorId: current.id, entityType, entityId, action, details });
}
function validId(raw: string | string[] | undefined) { return idSchema.safeParse(Array.isArray(raw) ? raw[0] : raw); }
function publicCollaborator(c: typeof collaboratorsTable.$inferSelect) {
  return { id: c.id, email: c.email, fullName: c.fullName, role: c.role, permissions: c.permissions, isActive: c.isActive, lastLoginAt: c.lastLoginAt };
}
function safePasswordEquals(candidate: string, expected: string): boolean {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

router.post("/admin/login", rateLimit({
  windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
}), async (req, res): Promise<void> => {
  const body = z.object({ password: z.string().min(1).max(1024) }).safeParse(req.body);
  const password = process.env.ADMIN_PASSWORD;
  if (!password) { res.status(503).json({ error: "Admin non configuré." }); return; }
  if (!body.success || !safePasswordEquals(body.data.password, password)) { res.status(401).json({ error: "Mot de passe incorrect." }); return; }
  const [admin] = await db.select().from(collaboratorsTable).where(eq(collaboratorsTable.email, "admin@somiren.local")).limit(1);
  if (!admin || !admin.isActive) { res.status(503).json({ error: "Compte administrateur indisponible." }); return; }
  await createCollaboratorSession(req, res, admin.id);
  await db.update(collaboratorsTable).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(collaboratorsTable.id, admin.id));
  res.json({ profile: publicCollaborator(admin) });
});
router.get("/admin/session", requireAdminAccess as any, (_req, res): void => { res.json({ profile: publicCollaborator(actor(res)) }); });
router.use(requireAdminAccess as any);

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const [collaborators, cases, requests, meetings, shipments] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(collaboratorsTable).where(and(eq(collaboratorsTable.isActive, true), ne(collaboratorsTable.email, "admin@somiren.local"))),
    db.select({ count: sql<number>`count(*)::int` }).from(casesTable).where(ne(casesTable.status, "completed")),
    db.select({ count: sql<number>`count(*)::int` }).from(executiveRequestsTable).where(ne(executiveRequestsTable.status, "completed")),
    db.select({ count: sql<number>`count(*)::int` }).from(meetingsTable).where(gt(meetingsTable.startsAt, new Date())),
    db.select({ count: sql<number>`count(*)::int` }).from(shipmentsTable),
  ]);
  const recentActivity = await db.select({
    activity: activityLogsTable,
    actor: {
      id: collaboratorsTable.id,
      fullName: collaboratorsTable.fullName,
      email: collaboratorsTable.email,
    },
  })
    .from(activityLogsTable).innerJoin(collaboratorsTable, eq(activityLogsTable.collaboratorId, collaboratorsTable.id))
    .orderBy(desc(activityLogsTable.createdAt)).limit(20);
  res.json({ counts: { activeCollaborators: collaborators[0]?.count ?? 0, openCases: cases[0]?.count ?? 0, openRequests: requests[0]?.count ?? 0, upcomingMeetings: meetings[0]?.count ?? 0, totalShipments: shipments[0]?.count ?? 0 }, recentActivity });
});
router.get("/admin/collaborators", async (_req, res): Promise<void> => {
  const collaborators = await db.select().from(collaboratorsTable).where(ne(collaboratorsTable.email, "admin@somiren.local")).orderBy(collaboratorsTable.fullName);
  res.json({ collaborators: collaborators.map(publicCollaborator) });
});
router.patch("/admin/collaborators/:id", async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  const body = z.object({ isActive: z.boolean().optional(), role: roleSchema.optional(), permissions: permissionSchema.optional(), newPassword: z.string().min(12).max(1024).optional() }).refine(v => Object.keys(v).length > 0).safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid collaborator update" }); return; }
  const current = actor(res); const [target] = await db.select().from(collaboratorsTable).where(eq(collaboratorsTable.id, id.data));
  if (!target) { res.status(404).json({ error: "Collaborator not found" }); return; }
  if (target.id === current.id && (body.data.isActive === false || (body.data.role && body.data.role !== "ADMIN"))) { res.status(400).json({ error: "An administrator cannot suspend or demote itself." }); return; }
  const changes: Record<string, unknown> = { ...body.data, updatedAt: new Date() }; delete changes.newPassword;
  if (body.data.newPassword) { changes.passwordHash = await hashCollaboratorPassword(body.data.newPassword); changes.mustChangePassword = true; }
  const [updated] = await db.update(collaboratorsTable).set(changes as any).where(eq(collaboratorsTable.id, target.id)).returning();
  if (body.data.isActive === false || body.data.newPassword) await db.delete(collaboratorSessionsTable).where(eq(collaboratorSessionsTable.collaboratorId, target.id));
  await addAdminActivity(current, "collaborator", target.id, "updated", { fields: Object.keys(body.data).filter(k => k !== "newPassword") });
  res.json({ collaborator: publicCollaborator(updated) });
});
router.get("/admin/roles", async (_req, res): Promise<void> => { res.json({ roles: await db.select().from(workspaceRolesTable).orderBy(workspaceRolesTable.label), availablePermissions: permissions }); });
router.patch("/admin/roles/:id", async (req, res): Promise<void> => {
  const id = validId(req.params.id); const body = z.object({ label: z.string().trim().min(1).max(120).optional(), permissions: permissionSchema.optional() }).refine(v => Object.keys(v).length > 0).safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid role update" }); return; }
  const result = await db.transaction(async tx => {
    const [existing] = await tx.select().from(workspaceRolesTable).where(eq(workspaceRolesTable.id, id.data)).limit(1);
    if (!existing) return { error: "Role not found", status: 404 };
    if (existing.label === "ADMIN" && body.data.label && body.data.label !== "ADMIN") return { error: "The ADMIN role cannot be renamed.", status: 400 };
    const nextPermissions = body.data.permissions ?? existing.permissions;
    if (existing.label === "ADMIN" && (!nextPermissions.includes("MANAGE_USERS") || !nextPermissions.includes("MANAGE_PERMISSIONS"))) {
      return { error: "ADMIN must retain MANAGE_USERS and MANAGE_PERMISSIONS.", status: 400 };
    }
    const [role] = await tx.update(workspaceRolesTable).set({ ...body.data, updatedAt: new Date() }).where(eq(workspaceRolesTable.id, existing.id)).returning();
    const collaboratorUpdate: Record<string, unknown> = { permissions: nextPermissions, updatedAt: new Date() };
    if (body.data.label && body.data.label !== existing.label) collaboratorUpdate.role = body.data.label;
    await tx.update(collaboratorsTable).set(collaboratorUpdate as any).where(eq(collaboratorsTable.role, existing.label));
    return { role };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  const role = result.role;
  await addAdminActivity(actor(res), "role", role.id, "updated", { fields: Object.keys(body.data) }); res.json({ role });
});

const caseSchema = z.object({ reference: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(300), summary: z.string().trim().min(1).max(2000), description: z.string().max(10000).optional(), instructions: z.string().max(5000).optional(), dueDate: z.coerce.date().nullable().optional(), status: z.enum(["active", "waiting", "completed", "on_hold"]).optional(), priority: prioritySchema.optional(), progress: z.number().int().min(0).max(100).optional(), assigneeId: idSchema });
router.get("/admin/cases", async (_req, res): Promise<void> => { const cases = await db.select({ case: casesTable, assignee: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email } }).from(casesTable).innerJoin(collaboratorsTable, eq(casesTable.assigneeId, collaboratorsTable.id)).orderBy(desc(casesTable.updatedAt)); res.json({ cases }); });
router.post("/admin/cases", async (req, res): Promise<void> => {
  const body = caseSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid case" }); return; }
  const [assignee] = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable).where(and(eq(collaboratorsTable.id, body.data.assigneeId), eq(collaboratorsTable.isActive, true)));
  if (!assignee) { res.status(400).json({ error: "Invalid active assignee" }); return; }
  const [item] = await db.insert(casesTable).values(body.data).returning(); await addAdminActivity(actor(res), "case", item.id, "created"); res.status(201).json({ case: item });
});
router.patch("/admin/cases/:id", async (req, res): Promise<void> => {
  const id = validId(req.params.id); const body = caseSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid case update" }); return; }
  if (body.data.assigneeId) { const [a] = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable).where(and(eq(collaboratorsTable.id, body.data.assigneeId), eq(collaboratorsTable.isActive, true))); if (!a) { res.status(400).json({ error: "Invalid active assignee" }); return; } }
  const [item] = await db.update(casesTable).set({ ...body.data, updatedAt: new Date() }).where(eq(casesTable.id, id.data)).returning(); if (!item) { res.status(404).json({ error: "Case not found" }); return; } await addAdminActivity(actor(res), "case", item.id, "updated"); res.json({ case: item });
});

const assignmentSchema = z.object({ collaboratorId: idSchema, caseId: idSchema, title: z.string().trim().min(1).max(300), contentType: z.string().max(255).optional(), objectPath: z.string().max(2000).optional(), priority: prioritySchema, dueAt: z.coerce.date().nullable().optional(), instruction: z.string().max(5000).optional() });
router.get("/admin/document-assignments", async (_req, res): Promise<void> => { const assignments = await db.select({ assignment: documentAssignmentsTable, document: documentsTable, collaborator: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email }, case: casesTable }).from(documentAssignmentsTable).innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id)).innerJoin(collaboratorsTable, eq(documentAssignmentsTable.collaboratorId, collaboratorsTable.id)).leftJoin(casesTable, eq(documentsTable.caseId, casesTable.id)).orderBy(desc(documentAssignmentsTable.updatedAt)); res.json({ assignments }); });
router.post("/admin/document-assignments", async (req, res): Promise<void> => {
  const body = assignmentSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid document assignment" }); return; } const current = actor(res);
  const result = await db.transaction(async tx => { const [workspaceCase] = await tx.select().from(casesTable).where(and(eq(casesTable.id, body.data.caseId), eq(casesTable.assigneeId, body.data.collaboratorId))); if (!workspaceCase) return undefined; const [document] = await tx.insert(documentsTable).values({ caseId: body.data.caseId, title: body.data.title, contentType: body.data.contentType, objectPath: body.data.objectPath, uploadedById: current.id }).returning(); const [assignment] = await tx.insert(documentAssignmentsTable).values({ documentId: document.id, collaboratorId: body.data.collaboratorId, priority: body.data.priority, dueAt: body.data.dueAt, instruction: body.data.instruction }).returning(); return { document, assignment }; });
  if (!result) { res.status(400).json({ error: "Case must exist and be assigned to the selected collaborator" }); return; } await addAdminActivity(current, "document_assignment", result.assignment.id, "created"); res.status(201).json(result);
});

const requestSchema = z.object({ assigneeId: idSchema, title: z.string().trim().min(1).max(300), description: z.string().max(5000).optional(), priority: prioritySchema.optional(), dueAt: z.coerce.date().nullable().optional(), status: z.enum(["new", "accepted", "in_progress", "submitted", "validated", "revision_required", "completed"]).optional() });
router.get("/admin/requests", async (_req, res): Promise<void> => { res.json({ requests: await db.select({ request: executiveRequestsTable, assignee: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email } }).from(executiveRequestsTable).innerJoin(collaboratorsTable, eq(executiveRequestsTable.assigneeId, collaboratorsTable.id)).orderBy(desc(executiveRequestsTable.updatedAt)) }); });
async function isActiveCollaborator(id: number): Promise<boolean> {
  const [person] = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.id, id), eq(collaboratorsTable.isActive, true))).limit(1);
  return Boolean(person);
}
router.post("/admin/requests", async (req, res): Promise<void> => { const body = requestSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; } if (!await isActiveCollaborator(body.data.assigneeId)) { res.status(400).json({ error: "Invalid active assignee" }); return; } const [item] = await db.insert(executiveRequestsTable).values(body.data).returning(); await addAdminActivity(actor(res), "executive_request", item.id, "created"); res.status(201).json({ request: item }); });
router.patch("/admin/requests/:id", async (req, res): Promise<void> => { const id = validId(req.params.id), body = requestSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid request update" }); return; } if (body.data.assigneeId && !await isActiveCollaborator(body.data.assigneeId)) { res.status(400).json({ error: "Invalid active assignee" }); return; } const [item] = await db.update(executiveRequestsTable).set({ ...body.data, updatedAt: new Date() }).where(eq(executiveRequestsTable.id, id.data)).returning(); if (!item) { res.status(404).json({ error: "Request not found" }); return; } await addAdminActivity(actor(res), "executive_request", item.id, "updated"); res.json({ request: item }); });

const meetingSchema = z.object({ title: z.string().trim().min(1).max(300), description: z.string().max(5000).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().nullable().optional(), meetingUrl: z.string().url().max(2000).optional(), participantIds: z.array(idSchema).min(1).max(100).transform(v => [...new Set(v)]) }).refine(v => !v.endsAt || v.endsAt > v.startsAt, "Meeting end must follow start");
router.get("/admin/meetings", async (_req, res): Promise<void> => { const rows = await db.select({ meeting: meetingsTable, participant: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email } }).from(meetingsTable).leftJoin(meetingParticipantsTable, eq(meetingsTable.id, meetingParticipantsTable.meetingId)).leftJoin(collaboratorsTable, eq(meetingParticipantsTable.collaboratorId, collaboratorsTable.id)).orderBy(desc(meetingsTable.startsAt)); const grouped = new Map<number, any>(); for (const row of rows) { const value = grouped.get(row.meeting.id) ?? { ...row.meeting, participants: [] }; if (row.participant) value.participants.push(row.participant); grouped.set(row.meeting.id, value); } res.json({ meetings: [...grouped.values()] }); });
router.post("/admin/meetings", async (req, res): Promise<void> => { const body = meetingSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid meeting" }); return; } const current = actor(res); const meeting = await db.transaction(async tx => { const people = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable).where(and(inArray(collaboratorsTable.id, body.data.participantIds), eq(collaboratorsTable.isActive, true))); if (people.length !== body.data.participantIds.length) return undefined; const [created] = await tx.insert(meetingsTable).values({ title: body.data.title, description: body.data.description, startsAt: body.data.startsAt, endsAt: body.data.endsAt, meetingUrl: body.data.meetingUrl }).returning(); await tx.insert(meetingParticipantsTable).values(body.data.participantIds.map(collaboratorId => ({ meetingId: created.id, collaboratorId }))); return created; }); if (!meeting) { res.status(400).json({ error: "All participants must be active collaborators" }); return; } await addAdminActivity(current, "meeting", meeting.id, "created"); res.status(201).json({ meeting }); });
router.get("/admin/activity", async (_req, res): Promise<void> => { const activity = await db.select({ activity: activityLogsTable, actor: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email } }).from(activityLogsTable).innerJoin(collaboratorsTable, eq(activityLogsTable.collaboratorId, collaboratorsTable.id)).orderBy(desc(activityLogsTable.createdAt)).limit(200); res.json({ activity }); });
router.get("/admin/security", async (_req, res): Promise<void> => { const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(collaboratorSessionsTable).where(gt(collaboratorSessionsTable.expiresAt, new Date())); res.json({ adminSessionProtection: true, backendVideoPermission: true, adminTwoFactor: false, activeSessionCount: count?.count ?? 0 }); });

export default router;