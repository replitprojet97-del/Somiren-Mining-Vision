import {
  activityLogsTable, casesTable, collaboratorsTable, db, notificationsTable, tasksTable,
} from "@workspace/db";
import {
  CreateAdminTaskBody, UpdateAdminTaskBody, CreateAdminTaskResponse, UpdateAdminTaskResponse,
  ListAdminTasksResponse,
} from "@workspace/api-zod";
import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAdminAccess } from "./adminWorkspace";
import { isConfidentialAdminRole } from "./privateMediaValidation";

const router: IRouter = Router();
const idSchema = z.coerce.number().int().positive();
type Actor = typeof collaboratorsTable.$inferSelect;
const taskPermissions = ["workspace:read", "VIEW_ASSIGNED_TASKS", "MANAGE_ASSIGNED_TASKS"];

router.use("/admin/tasks", requireAdminAccess, (_req: Request, res: Response, next: () => void) => {
  if (!isConfidentialAdminRole((res.locals.adminActor as Actor).role)) {
    res.status(403).json({ error: "Administrator role required" });
    return;
  }
  next();
});

router.get("/admin/tasks", async (_req, res): Promise<void> => {
  const rows = await db.select({
    task: tasksTable, assigneeName: collaboratorsTable.fullName, caseTitle: casesTable.title,
  }).from(tasksTable)
    .innerJoin(collaboratorsTable, eq(tasksTable.assigneeId, collaboratorsTable.id))
    .leftJoin(casesTable, eq(tasksTable.caseId, casesTable.id))
    .orderBy(desc(tasksTable.updatedAt));
  res.json(ListAdminTasksResponse.parse({
    tasks: rows.map(row => ({ ...row.task, assigneeName: row.assigneeName, caseTitle: row.caseTitle })),
  }));
});

router.post("/admin/tasks", async (req, res): Promise<void> => {
  const body = CreateAdminTaskBody.safeParse(req.body);
  if (!body.success || !body.data.title.trim()) {
    res.status(400).json({ error: "Invalid task details" });
    return;
  }
  const current = res.locals.adminActor as Actor;
  const result = await db.transaction(async tx => {
    const [recipient] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, body.data.assigneeId)).for("update").limit(1);
    if (!recipient?.isActive || recipient.role === "ADMIN") {
      return { error: "An active collaborator is required" };
    }
    if (body.data.caseId) {
      const [record] = await tx.select({ id: casesTable.id }).from(casesTable)
        .where(and(eq(casesTable.id, body.data.caseId), eq(casesTable.assigneeId, recipient.id))).for("share").limit(1);
      if (!record) return { error: "Case must belong to the selected collaborator" };
    }
    const [task] = await tx.insert(tasksTable).values({
      ...body.data, title: body.data.title.trim(),
    }).returning();
    if (taskPermissions.some(permission => !recipient.permissions.includes(permission))) {
      await tx.update(collaboratorsTable).set({
        permissions: [...new Set([...recipient.permissions, ...taskPermissions])], updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, recipient.id));
    }
    await tx.insert(notificationsTable).values({
      collaboratorId: recipient.id, title: "Nouvelle tâche", body: task.title,
    });
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "task", entityId: task.id,
      action: "assigned", details: { assigneeId: recipient.id, caseId: task.caseId },
    });
    return { task };
  });
  if ("error" in result) { res.status(400).json(result); return; }
  res.status(201).json(CreateAdminTaskResponse.parse(result));
});

router.patch("/admin/tasks/:id", async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id);
  const body = UpdateAdminTaskBody.safeParse(req.body);
  if (!id.success || !body.success || !Object.keys(body.data).length
    || (body.data.title !== undefined && !body.data.title.trim())) {
    res.status(400).json({ error: "Invalid task update" });
    return;
  }
  const current = res.locals.adminActor as Actor;
  const result = await db.transaction(async tx => {
    const [existing] = await tx.select().from(tasksTable)
      .where(eq(tasksTable.id, id.data)).for("update").limit(1);
    if (!existing) return { error: "Task not found", status: 404 };
    const assigneeId = body.data.assigneeId ?? existing.assigneeId;
    const [recipient] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, assigneeId)).for("update").limit(1);
    if (!recipient?.isActive || recipient.role === "ADMIN") {
      return { error: "An active collaborator is required", status: 400 };
    }
    const caseId = body.data.caseId === undefined ? existing.caseId : body.data.caseId;
    if (caseId) {
      const [record] = await tx.select({ id: casesTable.id }).from(casesTable)
        .where(and(eq(casesTable.id, caseId), eq(casesTable.assigneeId, assigneeId))).for("share").limit(1);
      if (!record) return { error: "Case must belong to the selected collaborator", status: 400 };
    }
    const [task] = await tx.update(tasksTable).set({
      ...body.data, ...(body.data.title === undefined ? {} : { title: body.data.title.trim() }),
      updatedAt: new Date(),
    }).where(eq(tasksTable.id, existing.id)).returning();
    if (taskPermissions.some(permission => !recipient.permissions.includes(permission))) {
      await tx.update(collaboratorsTable).set({
        permissions: [...new Set([...recipient.permissions, ...taskPermissions])], updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, recipient.id));
    }
    if (assigneeId !== existing.assigneeId) {
      await tx.insert(notificationsTable).values({
        collaboratorId: assigneeId, title: "Nouvelle tâche", body: task.title,
      });
    }
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "task", entityId: task.id, action: "updated",
      details: { fields: Object.keys(body.data), assigneeId },
    });
    return { task };
  });
  if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
  res.json(UpdateAdminTaskResponse.parse(result));
});

router.delete("/admin/tasks/:id", async (req, res): Promise<void> => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid task id" }); return; }
  const current = res.locals.adminActor as Actor;
  const deleted = await db.transaction(async tx => {
    const [task] = await tx.delete(tasksTable).where(eq(tasksTable.id, id.data)).returning({ id: tasksTable.id });
    if (!task) return false;
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "task", entityId: task.id, action: "deleted",
    });
    return true;
  });
  if (!deleted) { res.status(404).json({ error: "Task not found" }); return; }
  res.json({ success: true });
});

export default router;