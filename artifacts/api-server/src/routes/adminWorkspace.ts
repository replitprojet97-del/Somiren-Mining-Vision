import {
  activityLogsTable, casesTable, collaboratorLoginChallengesTable, collaboratorSessionsTable,
  collaboratorTwoFactorTable, collaboratorsTable, db,
  documentAssignmentsTable, documentsTable, executiveRequestsTable, meetingParticipantsTable,
  meetingsTable, shipmentsTable, workspaceRolesTable, notificationsTable, conversationsTable,
  messagesTable, privateUploadsTable,
  videoAuthorizationsTable,
} from "@workspace/db";
import {
  AssignAdminVideoAuthorizationsBody, AssignAdminVideoAuthorizationsResponse,
  ListAdminVideoAuthorizationsResponse, RevokeAdminVideoAuthorizationParams,
  RevokeAdminVideoAuthorizationResponse,
} from "@workspace/api-zod";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { createCollaboratorSession, getWorkspaceActor, hashCollaboratorPassword } from "./collaboratorAuth";
import { consumeUpload, createDownloadUrl, getConsumedAsset } from "./privateMedia";
import { isConfidentialAdminRole, isValidAudioMessage } from "./privateMediaValidation";
import {
  canAssignCollaboratorAccess, deriveRolePermissions, isUserManager, mergeWorkspaceReadPermission,
  normalizeCollaboratorEmail, hasSupportedRolePermissions, addsUserManagementPermissions,
  isReservedAdminRoleRename, isProtectedCollaboratorAccount, isSelfRoleDemotion,
} from "./adminCollaboratorPolicy";

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
const BOOTSTRAP_ADMIN_EMAIL = "admin@somiren.local";

function actor(res: Response): Actor { return res.locals.adminActor as Actor; }
function requireAdminPermission(permission: string) {
  return (_req: Request, res: Response, next: () => void): void => {
    if (!actor(res).permissions.includes(permission)) {
      res.status(403).json({ error: `Permission required: ${permission}` });
      return;
    }
    next();
  };
}
function requireConfidentialAdmin(_req: Request, res: Response, next: () => void): void {
  if (!isConfidentialAdminRole(actor(res).role)) {
    res.status(403).json({ error: "Administrator role required for confidential workspace data" });
    return;
  }
  next();
}
function requireUserManager(_req: Request, res: Response, next: () => void): void {
  if (!isUserManager(actor(res))) {
    res.status(403).json({ error: "User management access required" });
    return;
  }
  next();
}
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
  return { id: c.id, email: c.email, fullName: c.fullName, role: c.role, permissions: c.permissions, isActive: c.isActive, lastLoginAt: c.lastLoginAt, mustChangePassword: c.mustChangePassword, isTemporarilyLocked: Boolean(c.lockedUntil && c.lockedUntil > new Date()) };
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
  const [admin] = await db.select().from(collaboratorsTable).where(eq(collaboratorsTable.email, BOOTSTRAP_ADMIN_EMAIL)).limit(1);
  if (!admin || !admin.isActive) { res.status(503).json({ error: "Compte administrateur indisponible." }); return; }
  await createCollaboratorSession(req, res, admin.id);
  await db.update(collaboratorsTable).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(collaboratorsTable.id, admin.id));
  res.json({ profile: publicCollaborator(admin) });
});
router.get("/admin/session", requireAdminAccess as any, (_req, res): void => { res.json({ profile: publicCollaborator(actor(res)) }); });
// This router is mounted alongside collaborator routes, not under /admin.
// Restrict its guard so it cannot reject valid collaborator requests.
router.use("/admin", requireAdminAccess);

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
const createCollaboratorSchema = z.object({
  fullName: z.string().trim().min(1).max(300),
  email: z.string().trim().email().max(320).transform(normalizeCollaboratorEmail),
  role: roleSchema.default("COLLABORATOR"),
  newPassword: z.string().min(12).max(1024),
}).strict();
router.get("/admin/collaborators", requireUserManager, async (_req, res): Promise<void> => {
  const collaborators = await db.select().from(collaboratorsTable)
    .where(sql`lower(${collaboratorsTable.email}) <> ${BOOTSTRAP_ADMIN_EMAIL}`)
    .orderBy(collaboratorsTable.fullName);
  res.json({ collaborators: collaborators.map(publicCollaborator) });
});
router.post("/admin/collaborators", requireUserManager, async (req, res): Promise<void> => {
  const body = createCollaboratorSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid collaborator" }); return; }
  const current = actor(res);
  if (body.data.email === BOOTSTRAP_ADMIN_EMAIL) {
    res.status(400).json({ error: "The bootstrap administrator email is reserved" });
    return;
  }

  const passwordHash = await hashCollaboratorPassword(body.data.newPassword);
  let result: { collaborator?: typeof collaboratorsTable.$inferSelect; error?: string; status?: number };
  try {
    result = await db.transaction(async tx => {
      const [duplicate] = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
        .where(sql`lower(${collaboratorsTable.email}) = ${body.data.email}`).limit(1);
      if (duplicate) return { error: "A collaborator with this email already exists", status: 409 };

      const [selectedRole] = await tx.select().from(workspaceRolesTable)
        .where(eq(workspaceRolesTable.label, body.data.role)).limit(1);
      if (!selectedRole || !hasSupportedRolePermissions(selectedRole.permissions, permissions)) {
        return { error: "Unsupported collaborator role", status: 400 };
      }
      const assignedPermissions = deriveRolePermissions(selectedRole.permissions);
      if (!canAssignCollaboratorAccess(current.role, selectedRole.label, assignedPermissions)) {
        return { error: "Only an administrator may assign administrator or user-management access", status: 403 };
      }

      const [collaborator] = await tx.insert(collaboratorsTable).values({
        email: body.data.email,
        fullName: body.data.fullName,
        role: selectedRole.label,
        permissions: assignedPermissions,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
      }).returning();
      await tx.insert(activityLogsTable).values({
        collaboratorId: current.id,
        entityType: "collaborator",
        entityId: collaborator.id,
        action: "created",
        details: { email: collaborator.email, role: collaborator.role },
      });
      return { collaborator };
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      res.status(409).json({ error: "A collaborator with this email already exists" });
      return;
    }
    throw error;
  }
  if (result.error) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.status(201).json({ collaborator: publicCollaborator(result.collaborator!) });
});
router.post("/admin/collaborators/:id/restore-access", requireUserManager, async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid collaborator id" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [target] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, id.data)).for("update").limit(1);
    if (!target) return { error: "Collaborator not found", status: 404 };
    if (current.role !== "ADMIN" && isProtectedCollaboratorAccount(target.role, target.email, target.permissions)) {
      return { error: "Only an administrator may restore administrator access", status: 403 };
    }
    const [updated] = await tx.update(collaboratorsTable).set({
      isActive: true,
      permissions: mergeWorkspaceReadPermission(target.permissions),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(collaboratorsTable.id, target.id)).returning();
    await tx.delete(collaboratorSessionsTable)
      .where(eq(collaboratorSessionsTable.collaboratorId, target.id));
    await tx.delete(collaboratorLoginChallengesTable)
      .where(eq(collaboratorLoginChallengesTable.collaboratorId, target.id));
    await tx.update(collaboratorTwoFactorTable).set({
      pendingSecretCiphertext: null,
      pendingExpiresAt: null,
      updatedAt: new Date(),
    }).where(eq(collaboratorTwoFactorTable.collaboratorId, target.id));
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "collaborator",
      entityId: target.id,
      action: "access_restored",
      details: { fields: ["isActive", "permissions", "failedLoginAttempts", "lockedUntil"] },
    });
    return { collaborator: updated };
  });
  if (result.error) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.json({ collaborator: publicCollaborator(result.collaborator!) });
});
router.patch("/admin/collaborators/:id", requireUserManager, async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  const body = z.object({ isActive: z.boolean().optional(), role: roleSchema.optional(), permissions: permissionSchema.optional(), newPassword: z.string().min(12).max(1024).optional() }).refine(v => Object.keys(v).length > 0).safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid collaborator update" }); return; }
  const current = actor(res);
  const passwordHash = body.data.newPassword
    ? await hashCollaboratorPassword(body.data.newPassword)
    : undefined;
  const result = await db.transaction(async tx => {
    const [target] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, id.data)).for("update").limit(1);
    if (!target) return { error: "Collaborator not found", status: 404 };
    if (current.role !== "ADMIN" && isProtectedCollaboratorAccount(target.role, target.email, target.permissions)) {
      return { error: "Only an administrator may modify administrator accounts", status: 403 };
    }
    if (!canAssignCollaboratorAccess(current.role, body.data.role ?? target.role, body.data.permissions)) {
      return { error: "Only an administrator may assign administrator or user-management access", status: 403 };
    }
    if (target.id === current.id && (
      body.data.isActive === false ||
      isSelfRoleDemotion(true, target.role, body.data.role)
    )) {
      return { error: "An administrator cannot suspend or demote itself.", status: 400 };
    }
    const changes: Record<string, unknown> = { ...body.data, updatedAt: new Date() };
    delete changes.newPassword;
    if (passwordHash) { changes.passwordHash = passwordHash; changes.mustChangePassword = true; }
    const [collaborator] = await tx.update(collaboratorsTable).set(changes as any)
      .where(eq(collaboratorsTable.id, target.id)).returning();
    const accessStateChanged = body.data.isActive === false ||
      (body.data.isActive === true && !target.isActive);
    if (accessStateChanged || body.data.newPassword) {
      await tx.delete(collaboratorSessionsTable).where(eq(collaboratorSessionsTable.collaboratorId, target.id));
      await tx.delete(collaboratorLoginChallengesTable)
        .where(eq(collaboratorLoginChallengesTable.collaboratorId, target.id));
      await tx.update(collaboratorTwoFactorTable).set({
        pendingSecretCiphertext: null,
        pendingExpiresAt: null,
        updatedAt: new Date(),
      }).where(eq(collaboratorTwoFactorTable.collaboratorId, target.id));
    }
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "collaborator",
      entityId: target.id,
      action: "updated",
      details: { fields: Object.keys(body.data).filter(k => k !== "newPassword") },
    });
    return { collaborator };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.json({ collaborator: publicCollaborator(result.collaborator!) });
});
router.get("/admin/roles", async (_req, res): Promise<void> => { res.json({ roles: await db.select().from(workspaceRolesTable).orderBy(workspaceRolesTable.label), availablePermissions: permissions }); });
router.patch("/admin/roles/:id", requireAdminPermission("MANAGE_PERMISSIONS"), requireUserManager, async (req, res): Promise<void> => {
  const id = validId(req.params.id); const body = z.object({ label: z.string().trim().min(1).max(120).optional(), permissions: permissionSchema.optional() }).refine(v => Object.keys(v).length > 0).safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid role update" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [existing] = await tx.select().from(workspaceRolesTable).where(eq(workspaceRolesTable.id, id.data)).limit(1);
    if (!existing) return { error: "Role not found", status: 404 };
    if (existing.label === "ADMIN" && body.data.label && body.data.label !== "ADMIN") return { error: "The ADMIN role cannot be renamed.", status: 400 };
    if (isReservedAdminRoleRename(existing.label, body.data.label)) {
      return { error: "The ADMIN role name is reserved.", status: 400 };
    }
    if (current.role !== "ADMIN" && existing.label === "ADMIN") {
      return { error: "Only an administrator may modify the ADMIN role.", status: 403 };
    }
    if (current.role !== "ADMIN") {
      const [protectedMember] = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
        .where(and(
          eq(collaboratorsTable.role, existing.label),
          sql`${collaboratorsTable.permissions} ?| ARRAY['MANAGE_USERS', 'MANAGE_PERMISSIONS']`,
        )).limit(1);
      if (protectedMember) {
        return { error: "Only an administrator may modify roles assigned to user managers.", status: 403 };
      }
    }
    const nextPermissions = body.data.permissions ?? existing.permissions;
    if (current.role !== "ADMIN" && addsUserManagementPermissions(existing.permissions, nextPermissions)) {
      return { error: "Only an administrator may assign user-management permissions.", status: 403 };
    }
    if (existing.label === "ADMIN" && (!nextPermissions.includes("MANAGE_USERS") || !nextPermissions.includes("MANAGE_PERMISSIONS"))) {
      return { error: "ADMIN must retain MANAGE_USERS and MANAGE_PERMISSIONS.", status: 400 };
    }
    const [role] = await tx.update(workspaceRolesTable).set({ ...body.data, updatedAt: new Date() }).where(eq(workspaceRolesTable.id, existing.id)).returning();
    const collaboratorUpdate: Record<string, unknown> = { permissions: nextPermissions, updatedAt: new Date() };
    if (body.data.label && body.data.label !== existing.label) collaboratorUpdate.role = body.data.label;
    await tx.update(collaboratorsTable).set(collaboratorUpdate as any).where(eq(collaboratorsTable.role, existing.label));
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "role",
      entityId: role.id,
      action: "updated",
      details: { fields: Object.keys(body.data) },
    });
    return { role };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.json({ role: result.role });
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

const assignmentSchema = z.object({
  collaboratorId: idSchema,
  caseId: idSchema.optional(),
  title: z.string().trim().min(1).max(300),
  manualContent: z.string().max(10000).optional(),
  assetId: z.string().uuid().optional(),
  priority: prioritySchema.default("normal"),
  dueAt: z.coerce.date().nullable().optional(),
  instruction: z.string().max(5000).optional(),
}).strict().refine(value => Boolean(value.assetId || value.manualContent?.trim()), "An attachment or manual content is required");
router.get("/admin/document-assignments", requireConfidentialAdmin, async (_req, res): Promise<void> => { const assignments = await db.select({ assignment: documentAssignmentsTable, document: documentsTable, collaborator: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email }, case: casesTable }).from(documentAssignmentsTable).innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id)).innerJoin(collaboratorsTable, eq(documentAssignmentsTable.collaboratorId, collaboratorsTable.id)).leftJoin(casesTable, eq(documentsTable.caseId, casesTable.id)).orderBy(desc(documentAssignmentsTable.updatedAt)); res.json({ assignments }); });
router.post("/admin/document-assignments", requireConfidentialAdmin, async (req, res): Promise<void> => {
  const body = assignmentSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid document assignment" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [collaborator] = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
      .where(and(eq(collaboratorsTable.id, body.data.collaboratorId), eq(collaboratorsTable.isActive, true))).limit(1);
    if (!collaborator) return { error: "Collaborator must be active" };
    if (body.data.caseId) {
      const [workspaceCase] = await tx.select({ id: casesTable.id }).from(casesTable)
        .where(and(eq(casesTable.id, body.data.caseId), eq(casesTable.assigneeId, body.data.collaboratorId))).limit(1);
      if (!workspaceCase) return { error: "Case must belong to the selected collaborator" };
    }
    let asset: Awaited<ReturnType<typeof consumeUpload>>;
    if (body.data.assetId) {
      asset = await consumeUpload(tx, body.data.assetId, current.id, "document", "document");
      if (!asset) return { error: "Attachment must be a completed document uploaded by this administrator" };
    }
    const [document] = await tx.insert(documentsTable).values({
      caseId: body.data.caseId ?? null,
      title: body.data.title,
      manualContent: body.data.manualContent,
      contentType: asset?.contentType ?? null,
      objectPath: asset?.objectPath ?? null,
      assetId: asset?.id ?? null,
      fileName: asset?.fileName ?? null,
      fileSize: asset?.size ?? null,
      uploadedById: current.id,
    }).returning();
    const [assignment] = await tx.insert(documentAssignmentsTable).values({
      documentId: document.id, collaboratorId: body.data.collaboratorId, priority: body.data.priority,
      dueAt: body.data.dueAt, instruction: body.data.instruction,
    }).returning();
    await tx.insert(notificationsTable).values({
      collaboratorId: body.data.collaboratorId,
      title: "New document assigned",
      body: `A document has been assigned: ${body.data.title}`,
    });
    return { document, assignment };
  });
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  await addAdminActivity(current, "document_assignment", result.assignment.id, "created");
  res.status(201).json(result);
});
router.get("/admin/document-assignments/:id/file", requireConfidentialAdmin, async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid assignment id" }); return; }
  const [row] = await db.select({ document: documentsTable }).from(documentAssignmentsTable)
    .innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id))
    .where(eq(documentAssignmentsTable.id, id.data)).limit(1);
  if (!row?.document.assetId) { res.status(404).json({ error: "Document attachment not found" }); return; }
  const asset = await getConsumedAsset(row.document.assetId, "document");
  if (!asset) { res.status(404).json({ error: "Document attachment not found" }); return; }
  const url = await createDownloadUrl(asset);
  if (!url) { req.log.warn("Private document download signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn: 300 });
});

const requestSchema = z.object({ assigneeId: idSchema, title: z.string().trim().min(1).max(300), description: z.string().max(5000).optional(), priority: prioritySchema.optional(), dueAt: z.coerce.date().nullable().optional(), status: z.enum(["new", "accepted", "in_progress", "submitted", "validated", "revision_required", "completed"]).optional() });
router.get("/admin/requests", async (_req, res): Promise<void> => { res.json({ requests: await db.select({ request: executiveRequestsTable, assignee: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email } }).from(executiveRequestsTable).innerJoin(collaboratorsTable, eq(executiveRequestsTable.assigneeId, collaboratorsTable.id)).orderBy(desc(executiveRequestsTable.updatedAt)) }); });
async function isActiveCollaborator(id: number): Promise<boolean> {
  const [person] = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.id, id), eq(collaboratorsTable.isActive, true))).limit(1);
  return Boolean(person);
}
router.post("/admin/requests", async (req, res): Promise<void> => { const body = requestSchema.safeParse(req.body); if (!body.success) { res.status(400).json({ error: "Invalid request" }); return; } if (!await isActiveCollaborator(body.data.assigneeId)) { res.status(400).json({ error: "Invalid active assignee" }); return; } const [item] = await db.insert(executiveRequestsTable).values(body.data).returning(); await db.insert(notificationsTable).values({ collaboratorId: item.assigneeId, title: "New request", body: `A request has been assigned: ${item.title}` }); await addAdminActivity(actor(res), "executive_request", item.id, "created"); res.status(201).json({ request: item }); });
router.patch("/admin/requests/:id", async (req, res): Promise<void> => { const id = validId(req.params.id), body = requestSchema.partial().refine(v => Object.keys(v).length > 0).safeParse(req.body); if (!id.success || !body.success) { res.status(400).json({ error: "Invalid request update" }); return; } if (body.data.assigneeId && !await isActiveCollaborator(body.data.assigneeId)) { res.status(400).json({ error: "Invalid active assignee" }); return; } const [item] = await db.update(executiveRequestsTable).set({ ...body.data, updatedAt: new Date() }).where(eq(executiveRequestsTable.id, id.data)).returning(); if (!item) { res.status(404).json({ error: "Request not found" }); return; } await addAdminActivity(actor(res), "executive_request", item.id, "updated"); res.json({ request: item }); });

const meetingSchema = z.object({ title: z.string().trim().min(1).max(300), description: z.string().max(5000).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().nullable().optional(), meetingUrl: z.string().url().max(2000).optional(), participantIds: z.array(idSchema).min(1).max(100).transform(v => [...new Set(v)]) });
router.get("/admin/meetings", requireConfidentialAdmin, async (_req, res): Promise<void> => { const rows = await db.select({ meeting: meetingsTable, participant: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email }, video: { fileName: privateUploadsTable.fileName, contentType: privateUploadsTable.contentType } }).from(meetingsTable).leftJoin(meetingParticipantsTable, eq(meetingsTable.id, meetingParticipantsTable.meetingId)).leftJoin(collaboratorsTable, eq(meetingParticipantsTable.collaboratorId, collaboratorsTable.id)).leftJoin(privateUploadsTable, eq(meetingsTable.videoAssetId, privateUploadsTable.id)).orderBy(desc(meetingsTable.startsAt)); const grouped = new Map<number, any>(); for (const row of rows) { const value = grouped.get(row.meeting.id) ?? { ...row.meeting, videoFileName: row.video?.fileName ?? null, videoContentType: row.video?.contentType ?? null, participants: [] }; if (row.participant) value.participants.push(row.participant); grouped.set(row.meeting.id, value); } res.json({ meetings: [...grouped.values()] }); });
const meetingCreateSchema = meetingSchema.extend({ videoAssetId: z.string().uuid().optional(), authorizeVideoParticipants: z.boolean().optional() })
  .refine(v => !v.endsAt || v.endsAt > v.startsAt, "Meeting end must follow start");
router.post("/admin/meetings", requireConfidentialAdmin, async (req, res): Promise<void> => {
  const body = meetingCreateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid meeting" }); return; }
  const current = actor(res);
  const created = await db.transaction(async tx => {
    const people = await tx.select().from(collaboratorsTable)
      .where(and(inArray(collaboratorsTable.id, body.data.participantIds), eq(collaboratorsTable.isActive, true)))
      .orderBy(asc(collaboratorsTable.id)).for("update");
    if (people.length !== body.data.participantIds.length) return { error: "All participants must be active collaborators" };
    let videoAsset: Awaited<ReturnType<typeof consumeUpload>>;
    if (body.data.videoAssetId) {
      videoAsset = await consumeUpload(tx, body.data.videoAssetId, current.id, "video", "meeting-video");
      if (!videoAsset) return { error: "Video must be a completed video uploaded by this administrator" };
    }
    const [meeting] = await tx.insert(meetingsTable).values({
      title: body.data.title, description: body.data.description, startsAt: body.data.startsAt,
      endsAt: body.data.endsAt, meetingUrl: body.data.meetingUrl, videoAssetId: videoAsset?.id ?? null,
    }).returning();
    await tx.insert(meetingParticipantsTable).values(body.data.participantIds.map(collaboratorId => ({ meetingId: meeting.id, collaboratorId })));
    if (body.data.authorizeVideoParticipants) {
      await Promise.all(people.map(person => tx.update(collaboratorsTable).set({
        permissions: [...new Set([...person.permissions, "CAN_USE_VIDEO_CONFERENCE", "PARTICIPATE_IN_MEETINGS"])],
        updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, person.id))));
    }
    await tx.insert(notificationsTable).values(body.data.participantIds.map(collaboratorId => ({
      collaboratorId, title: "Meeting scheduled", body: `You have been invited to ${meeting.title}.`,
    })));
    return { meeting, videoAsset };
  });
  if ("error" in created) { res.status(400).json({ error: created.error }); return; }
  await addAdminActivity(current, "meeting", created.meeting.id, "created");
  res.status(201).json({ meeting: { ...created.meeting, videoFileName: created.videoAsset?.fileName ?? null, videoContentType: created.videoAsset?.contentType ?? null } });
});
router.get("/admin/meetings/:id/video", requireConfidentialAdmin, async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid meeting id" }); return; }
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id.data)).limit(1);
  if (!meeting?.videoAssetId) { res.status(404).json({ error: "Meeting video not found" }); return; }
  const asset = await getConsumedAsset(meeting.videoAssetId, "meeting-video");
  if (!asset) { res.status(404).json({ error: "Meeting video not found" }); return; }
  const url = await createDownloadUrl(asset);
  if (!url) { req.log.warn("Private meeting video signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn: 300 });
});

const liveVideoAssignmentSchema = z.object({
  meetingTitle: z.string().trim().min(1).max(300),
  meetingUrl: z.string().url().max(2000).refine(value => new URL(value).protocol === "https:"),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  collaboratorIds: z.array(idSchema).min(1).max(100).transform(ids => [...new Set(ids)]),
}).strict().refine(value => value.expiresAt > value.startsAt, "Meeting end must follow start");

router.get("/admin/video-authorizations", requireConfidentialAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select({
    authorization: videoAuthorizationsTable,
    collaborator: {
      id: collaboratorsTable.id,
      fullName: collaboratorsTable.fullName,
      email: collaboratorsTable.email,
      role: collaboratorsTable.role,
      isActive: collaboratorsTable.isActive,
    },
  }).from(videoAuthorizationsTable)
    .innerJoin(collaboratorsTable, eq(videoAuthorizationsTable.collaboratorId, collaboratorsTable.id))
    .orderBy(desc(videoAuthorizationsTable.startsAt));
  res.json(ListAdminVideoAuthorizationsResponse.parse({ assignments: rows }));
});

router.post("/admin/video-authorizations", requireConfidentialAdmin, async (req, res): Promise<void> => {
  const body = liveVideoAssignmentSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid live video assignment" }); return; }
  const contractBody = AssignAdminVideoAuthorizationsBody.strict().safeParse(body.data);
  if (!contractBody.success) { res.status(400).json({ error: "Invalid live video assignment" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const people = await tx.select().from(collaboratorsTable).where(and(
      inArray(collaboratorsTable.id, body.data.collaboratorIds),
      eq(collaboratorsTable.isActive, true),
      ne(collaboratorsTable.role, "ADMIN"),
      ne(collaboratorsTable.email, BOOTSTRAP_ADMIN_EMAIL),
    )).for("update");
    if (people.length !== body.data.collaboratorIds.length) {
      return { error: "All participants must be active non-administrator collaborators" };
    }

    const authorizations = await tx.insert(videoAuthorizationsTable).values(people.map(person => ({
      collaboratorId: person.id,
      meetingTitle: body.data.meetingTitle,
      meetingUrl: body.data.meetingUrl,
      startsAt: body.data.startsAt,
      expiresAt: body.data.expiresAt,
    }))).returning();

    for (const person of people) {
      if (!person.permissions.includes("CAN_USE_VIDEO_CONFERENCE")) {
        await tx.update(collaboratorsTable).set({
          permissions: [...new Set([...person.permissions, "CAN_USE_VIDEO_CONFERENCE"])],
          updatedAt: new Date(),
        }).where(eq(collaboratorsTable.id, person.id));
      }
    }

    await tx.insert(notificationsTable).values(people.map(person => ({
      collaboratorId: person.id,
      title: "Visioconférence planifiée",
      body: `Vous êtes invité(e) à la visioconférence « ${body.data.meetingTitle} ».`,
    })));
    await tx.insert(activityLogsTable).values(authorizations.map(authorization => ({
      collaboratorId: current.id,
      entityType: "video_authorization",
      entityId: authorization.id,
      action: "assigned",
      details: {
        collaboratorId: authorization.collaboratorId,
        meetingTitle: authorization.meetingTitle,
        startsAt: authorization.startsAt.toISOString(),
        expiresAt: authorization.expiresAt.toISOString(),
      },
    })));
    return { authorizations };
  });
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  res.status(201).json(AssignAdminVideoAuthorizationsResponse.parse({ assignments: result.authorizations }));
});

router.delete("/admin/video-authorizations/:id", requireConfidentialAdmin, async (req, res): Promise<void> => {
  const id = RevokeAdminVideoAuthorizationParams.safeParse(req.params);
  if (!id.success) { res.status(400).json({ error: "Invalid video authorization id" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [authorization] = await tx.select().from(videoAuthorizationsTable)
      .where(eq(videoAuthorizationsTable.id, id.data.id)).for("update").limit(1);
    if (!authorization) return { error: "Video authorization not found", status: 404 };
    if (authorization.isRevoked) return { authorization, alreadyRevoked: true };

    const [revoked] = await tx.update(videoAuthorizationsTable)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(and(eq(videoAuthorizationsTable.id, id.data.id), eq(videoAuthorizationsTable.isRevoked, false)))
      .returning();
    if (!revoked) return { error: "Video authorization could not be revoked", status: 409 };
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "video_authorization",
      entityId: revoked.id,
      action: "revoked",
      details: { collaboratorId: revoked.collaboratorId, meetingTitle: revoked.meetingTitle },
    });
    await tx.insert(notificationsTable).values({
      collaboratorId: revoked.collaboratorId,
      title: "Visioconférence annulée",
      body: `Votre accès à la visioconférence « ${revoked.meetingTitle} » a été révoqué.`,
    });
    return { authorization: revoked, alreadyRevoked: false };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.json(RevokeAdminVideoAuthorizationResponse.parse({
    authorization: result.authorization,
    alreadyRevoked: result.alreadyRevoked,
  }));
});

const conversationCreateSchema = z.object({
  collaboratorId: idSchema,
  subject: z.string().trim().min(1).max(300),
  initialMessage: z.string().trim().min(1).max(10000).optional(),
}).strict();
const threadMessageSchema = z.object({
  body: z.string().trim().min(1).max(10000).optional(),
  audioAssetId: z.string().uuid().optional(),
  transcript: z.string().trim().min(1).max(10000).optional(),
  translation: z.string().trim().min(1).max(10000).optional(),
  sourceLanguage: z.enum(["fr", "es"]).optional(),
  targetLanguage: z.enum(["fr", "es"]).optional(),
}).strict().superRefine((value, ctx) => {
  const audioFieldsPresent = Boolean(value.audioAssetId || value.transcript || value.translation || value.sourceLanguage || value.targetLanguage);
  if (audioFieldsPresent && !isValidAudioMessage(value)) ctx.addIssue({ code: "custom", message: "Audio messages require audio, transcript, translation, and distinct French/Spanish languages" });
  if (!value.body && !value.audioAssetId) ctx.addIssue({ code: "custom", message: "Message body or audio is required" });
});
router.get("/admin/conversations", requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (_req, res): Promise<void> => {
  const rows = await db.select({
    conversation: conversationsTable,
    collaborator: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email },
  }).from(conversationsTable).innerJoin(collaboratorsTable, eq(conversationsTable.collaboratorId, collaboratorsTable.id))
    .orderBy(desc(conversationsTable.updatedAt));
  res.json({ conversations: rows });
});
router.post("/admin/conversations", requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const body = conversationCreateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid conversation" }); return; }
  const current = actor(res);
  const [recipient] = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.id, body.data.collaboratorId), eq(collaboratorsTable.isActive, true))).limit(1);
  if (!recipient) { res.status(400).json({ error: "Collaborator must be active" }); return; }
  const conversation = await db.transaction(async tx => {
    const [created] = await tx.insert(conversationsTable).values({
      subject: body.data.subject, collaboratorId: body.data.collaboratorId,
    }).returning();
    if (body.data.initialMessage) {
      await tx.insert(messagesTable).values({ conversationId: created.id, senderId: current.id, body: body.data.initialMessage });
    }
    await tx.insert(notificationsTable).values({
      collaboratorId: body.data.collaboratorId, title: "New message",
      body: `A conversation has been started: ${body.data.subject}`,
    });
    return created;
  });
  res.status(201).json({ conversation });
});
router.get("/admin/conversations/:id/messages", requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid conversation id" }); return; }
  const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id.data)).limit(1);
  if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }
  const rows = await db.select({ message: messagesTable, audio: { fileName: privateUploadsTable.fileName, contentType: privateUploadsTable.contentType } })
    .from(messagesTable).leftJoin(privateUploadsTable, eq(messagesTable.audioAssetId, privateUploadsTable.id))
    .where(eq(messagesTable.conversationId, id.data)).orderBy(messagesTable.createdAt);
  res.json({ messages: rows.map(row => ({ ...row.message, audioFileName: row.audio?.fileName ?? null, audioContentType: row.audio?.contentType ?? null })) });
});
router.post("/admin/conversations/:id/messages", requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  const body = threadMessageSchema.safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid message" }); return; }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [conversation] = await tx.select().from(conversationsTable)
      .where(eq(conversationsTable.id, id.data)).for("update").limit(1);
    if (!conversation) return { error: "Conversation not found" };
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
    await tx.insert(notificationsTable).values({
      collaboratorId: conversation.collaboratorId, title: "New message",
      body: `You received a reply in: ${conversation.subject}`,
    });
    return { message: { ...message, audioFileName: audio?.fileName ?? null, audioContentType: audio?.contentType ?? null } };
  });
  if ("error" in result) { res.status(404).json({ error: result.error }); return; }
  if ("uploadError" in result) { res.status(400).json({ error: "Audio must be a completed audio upload owned by this administrator" }); return; }
  res.status(201).json(result);
});
router.get("/admin/conversations/:id/messages/:messageId/file", requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const id = validId(req.params.id), messageId = validId(req.params.messageId);
  if (!id.success || !messageId.success) { res.status(400).json({ error: "Invalid message id" }); return; }
  const [row] = await db.select({ message: messagesTable }).from(messagesTable)
    .where(and(eq(messagesTable.id, messageId.data), eq(messagesTable.conversationId, id.data))).limit(1);
  if (!row?.message.audioAssetId) { res.status(404).json({ error: "Audio message not found" }); return; }
  const asset = await getConsumedAsset(row.message.audioAssetId, "message-audio");
  if (!asset) { res.status(404).json({ error: "Audio message not found" }); return; }
  const url = await createDownloadUrl(asset);
  if (!url) { req.log.warn("Private message audio signing failed"); res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn: 300 });
});
router.get("/admin/notifications", async (_req, res): Promise<void> => {
  const current = actor(res);
  res.json({ notifications: await db.select().from(notificationsTable).where(eq(notificationsTable.collaboratorId, current.id)).orderBy(desc(notificationsTable.createdAt)) });
});
router.patch("/admin/notifications/:id/read", async (req, res): Promise<void> => {
  const id = validId(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid notification id" }); return; }
  const current = actor(res);
  const [notification] = await db.update(notificationsTable).set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notificationsTable.id, id.data), eq(notificationsTable.collaboratorId, current.id))).returning();
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json({ notification });
});
router.patch("/admin/notifications/read-all", async (_req, res): Promise<void> => {
  const current = actor(res);
  await db.update(notificationsTable).set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(notificationsTable.collaboratorId, current.id), eq(notificationsTable.isRead, false)));
  res.json({ updated: true });
});
// Unprefixed administrative aliases are retained for the API contract consumers.
router.get("/conversations", requireAdminAccess as any, requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (_req, res): Promise<void> => {
  const rows = await db.select({
    conversation: conversationsTable,
    collaborator: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email },
  }).from(conversationsTable).innerJoin(collaboratorsTable, eq(conversationsTable.collaboratorId, collaboratorsTable.id))
    .orderBy(desc(conversationsTable.updatedAt));
  res.json({ conversations: rows });
});
router.post("/conversations", requireAdminAccess as any, requireConfidentialAdmin, requireAdminPermission("USE_INTERNAL_MESSAGING"), async (req, res): Promise<void> => {
  const body = conversationCreateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid conversation" }); return; }
  const current = actor(res);
  const [recipient] = await db.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.id, body.data.collaboratorId), eq(collaboratorsTable.isActive, true))).limit(1);
  if (!recipient) { res.status(400).json({ error: "Collaborator must be active" }); return; }
  const conversation = await db.transaction(async tx => {
    const [created] = await tx.insert(conversationsTable).values({ subject: body.data.subject, collaboratorId: body.data.collaboratorId }).returning();
    if (body.data.initialMessage) await tx.insert(messagesTable).values({ conversationId: created.id, senderId: current.id, body: body.data.initialMessage });
    await tx.insert(notificationsTable).values({ collaboratorId: body.data.collaboratorId, title: "New message", body: `A conversation has been started: ${body.data.subject}` });
    return created;
  });
  res.status(201).json({ conversation });
});
router.get("/admin/activity", async (_req, res): Promise<void> => { const activity = await db.select({ activity: activityLogsTable, actor: { id: collaboratorsTable.id, fullName: collaboratorsTable.fullName, email: collaboratorsTable.email } }).from(activityLogsTable).innerJoin(collaboratorsTable, eq(activityLogsTable.collaboratorId, collaboratorsTable.id)).orderBy(desc(activityLogsTable.createdAt)).limit(200); res.json({ activity }); });
router.get("/admin/security", async (_req, res): Promise<void> => { const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(collaboratorSessionsTable).where(gt(collaboratorSessionsTable.expiresAt, new Date())); res.json({ adminSessionProtection: true, backendVideoPermission: true, adminTwoFactor: false, activeSessionCount: count?.count ?? 0 }); });

export default router;