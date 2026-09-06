import {
  activityLogsTable, casesTable, collaboratorsTable, db, documentsTable,
  notificationsTable, tasksTable, videoAuthorizationsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, gte, lte, sql } from "drizzle-orm";
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

async function seedNuria(actor: WorkspaceActor): Promise<void> {
  const existing = await db.select({ id: casesTable.id }).from(casesTable)
    .where(eq(casesTable.assigneeId, actor.id)).limit(1);
  if (existing.length) return;
  const [caseOne] = await db.insert(casesTable).values({
    reference: "DEMO-COM-001",
    title: "Préparation du comité stratégique", summary: "Coordination des éléments de préparation.",
    description: "Rassembler et vérifier les éléments nécessaires au prochain comité stratégique.",
    instructions: "Préparer une synthèse courte des décisions attendues et signaler tout point bloquant.",
    dueDate: new Date(Date.now() + 3 * 86400000),
    priority: "high", assigneeId: actor.id, progress: 25,
  }).returning();
  const [caseTwo] = await db.insert(casesTable).values({
    reference: "DEMO-EXE-002",
    title: "Suivi des priorités exécutives", summary: "Revue hebdomadaire des actions en cours.",
    description: "Mettre à jour l'état des actions prioritaires de la Direction.",
    instructions: "Identifier les échéances proches et préparer les demandes de clarification.",
    dueDate: new Date(Date.now() + 7 * 86400000),
    priority: "normal", assigneeId: actor.id, progress: 10,
  }).returning();
  await db.insert(tasksTable).values([
    { caseId: caseOne.id, title: "Consolider les points de décision", description: "Regrouper les décisions attendues dans une note structurée.", priority: "high", assigneeId: actor.id, dueAt: new Date() },
    { caseId: caseTwo.id, title: "Préparer la note de synthèse", description: "Résumer l'avancement et les blocages à présenter à la Direction.", assigneeId: actor.id, dueAt: new Date(Date.now() + 86400000) },
  ]);
  await db.insert(notificationsTable).values([
    { collaboratorId: actor.id, title: "Espace de démonstration", body: "Les données affichées sont des exemples clairement identifiés." },
    { collaboratorId: actor.id, title: "Priorité du jour", body: "Consolider les points de décision du comité." },
  ]);
  await addActivity(actor, "workspace", null, "demo_data_seeded", { label: "Nuria-only demo data" });
}

async function requireWorkspaceAccess(req: Request, res: Response, next: () => void): Promise<void> {
  try {
    const actor = await getWorkspaceActor(req);
    if (!actor) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    await seedNuria(actor);
    res.locals.workspaceActor = actor;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Workspace authorization failed");
    res.status(503).json({ error: "Workspace authorization is temporarily unavailable" });
  }
}

function actor(res: Response): WorkspaceActor {
  return res.locals.workspaceActor as WorkspaceActor;
}

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

router.get("/workspace/cases", async (_req, res): Promise<void> => {
  const current = actor(res);
  res.json({ cases: await db.select().from(casesTable).where(eq(casesTable.assigneeId, current.id)).orderBy(desc(casesTable.updatedAt)) });
});
router.get("/workspace/cases/:id", async (req, res): Promise<void> => {
  const parsed = idSchema.safeParse(req.params.id); if (!parsed.success) { res.status(400).json({ error: "Invalid case id" }); return; }
  const current = actor(res);
  const [workspaceCase] = await db.select().from(casesTable).where(and(eq(casesTable.id, parsed.data), eq(casesTable.assigneeId, current.id)));
  if (!workspaceCase) { res.status(404).json({ error: "Case not found" }); return; }
  const tasks = await db.select().from(tasksTable).where(and(eq(tasksTable.caseId, workspaceCase.id), eq(tasksTable.assigneeId, current.id)));
  const documents = await db.select().from(documentsTable).where(and(eq(documentsTable.caseId, workspaceCase.id), eq(documentsTable.uploadedById, current.id)));
  res.json({ case: workspaceCase, tasks, documents });
});
router.patch("/workspace/cases/:id", async (req, res): Promise<void> => {
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

router.get("/workspace/tasks", async (_req, res): Promise<void> => { const current = actor(res); res.json({ tasks: await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, current.id)).orderBy(asc(tasksTable.dueAt)) }); });
router.patch("/workspace/tasks/:id", async (req, res): Promise<void> => {
  const parsedId = idSchema.safeParse(req.params.id); const body = taskUpdateSchema.safeParse(req.body);
  if (!parsedId.success || !body.success) { res.status(400).json({ error: "Invalid task update" }); return; }
  const current = actor(res);
  const [updated] = await db.update(tasksTable).set({ status: body.data.status, comment: body.data.comment, updatedAt: new Date() }).where(and(eq(tasksTable.id, parsedId.data), eq(tasksTable.assigneeId, current.id))).returning();
  if (!updated) { res.status(404).json({ error: "Task not found" }); return; }
  await addActivity(current, "task", updated.id, "updated", body.data.comment ? { comment: body.data.comment } : {});
  res.json({ task: updated });
});

router.get("/workspace/documents", async (_req, res): Promise<void> => { const current = actor(res); res.json({ documents: await db.select().from(documentsTable).where(eq(documentsTable.uploadedById, current.id)).orderBy(desc(documentsTable.createdAt)) }); });
router.get("/workspace/notifications", async (_req, res): Promise<void> => { const current = actor(res); res.json({ notifications: await db.select().from(notificationsTable).where(eq(notificationsTable.collaboratorId, current.id)).orderBy(desc(notificationsTable.createdAt)) }); });
router.patch("/workspace/notifications/:id/read", async (req, res): Promise<void> => {
  const parsed = idSchema.safeParse(req.params.id); if (!parsed.success) { res.status(400).json({ error: "Invalid notification id" }); return; }
  const current = actor(res); const [notification] = await db.update(notificationsTable).set({ isRead: true, updatedAt: new Date() }).where(and(eq(notificationsTable.id, parsed.data), eq(notificationsTable.collaboratorId, current.id))).returning();
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; } res.json({ notification });
});
router.get("/workspace/activity", async (_req, res): Promise<void> => { const current = actor(res); res.json({ activity: await db.select().from(activityLogsTable).where(eq(activityLogsTable.collaboratorId, current.id)).orderBy(desc(activityLogsTable.createdAt)).limit(100) }); });
router.get("/workspace/video-access", async (_req, res): Promise<void> => {
  const current = actor(res); const now = new Date();
  const [authorization] = await db.select().from(videoAuthorizationsTable).where(and(eq(videoAuthorizationsTable.collaboratorId, current.id), eq(videoAuthorizationsTable.isRevoked, false), lte(videoAuthorizationsTable.startsAt, now), gte(videoAuthorizationsTable.expiresAt, now))).limit(1);
  if (!authorization) { res.json({ authorized: false, reason: "No active video authorization for this account." }); return; }
  res.json({ authorized: true, meeting: { title: authorization.meetingTitle, url: authorization.meetingUrl, startsAt: authorization.startsAt, expiresAt: authorization.expiresAt } });
});
router.post("/storage/uploads/request-url", (_req, res): void => { res.status(501).json({ error: "Private document uploads are not enabled; no upload URL was created." }); });

export default router;