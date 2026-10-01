import {
  activityLogsTable, collaboratorsTable, db, financialRecordsTable,
} from "@workspace/db";
import {
  AssignCollaboratorSalaryRecordBody, AssignCollaboratorSalaryRecordParams,
  AssignCollaboratorSalaryRecordResponse, ListCollaboratorSalaryRecordsParams,
  ListCollaboratorSalaryRecordsResponse, UpdateSalaryRecordBody, UpdateSalaryRecordParams,
  UpdateSalaryRecordResponse,
} from "@workspace/api-zod";
import { and, desc, eq, ne } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdminAccess } from "./adminWorkspace";
import { canManageConfidentialFinance, canReceiveArrears } from "./adminCollaboratorPolicy";

const router: IRouter = Router();
type Actor = typeof collaboratorsTable.$inferSelect;

function actor(res: Response): Actor {
  return res.locals.adminActor as Actor;
}

function requireConfidentialFinance(_req: Request, res: Response, next: () => void): void {
  if (!canManageConfidentialFinance(actor(res).role)) {
    res.status(403).json({ error: "Administrator role required for confidential finance data" });
    return;
  }
  next();
}

router.use("/admin", requireAdminAccess, requireConfidentialFinance);

router.get("/admin/collaborators/:collaboratorId/salary-records", async (req, res): Promise<void> => {
  const params = ListCollaboratorSalaryRecordsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid collaborator id" });
    return;
  }
  const [collaborator] = await db.select({ id: collaboratorsTable.id })
    .from(collaboratorsTable).where(eq(collaboratorsTable.id, params.data.collaboratorId)).limit(1);
  if (!collaborator) {
    res.status(404).json({ error: "Collaborator not found" });
    return;
  }
  const salaryRecords = await db.select().from(financialRecordsTable)
    .where(eq(financialRecordsTable.collaboratorId, collaborator.id))
    .orderBy(desc(financialRecordsTable.updatedAt));
  res.json(ListCollaboratorSalaryRecordsResponse.parse({ salaryRecords }));
});

router.post("/admin/collaborators/:collaboratorId/salary-records", async (req, res): Promise<void> => {
  const params = AssignCollaboratorSalaryRecordParams.safeParse(req.params);
  const body = AssignCollaboratorSalaryRecordBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid salary record details" });
    return;
  }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [recipient] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, params.data.collaboratorId)).for("update").limit(1);
    if (!recipient || !canReceiveArrears(recipient.role)) {
      return { error: "A non-administrator collaborator is required", status: 400 };
    }
    const [existing] = await tx.select({ id: financialRecordsTable.id })
      .from(financialRecordsTable)
      .where(and(
        eq(financialRecordsTable.collaboratorId, recipient.id),
        eq(financialRecordsTable.periodLabel, body.data.periodLabel),
      ))
      .limit(1);
    if (existing) {
      return { error: "A salary record for this period already exists; edit the existing record instead", status: 409 };
    }
    const [salaryRecord] = await tx.insert(financialRecordsTable).values({
      collaboratorId: recipient.id,
      periodLabel: body.data.periodLabel,
      salaryStatus: body.data.salaryStatus,
      communicatedDelayReason: body.data.communicatedDelayReason?.trim() || null,
    }).returning();
    await tx.update(collaboratorsTable).set({
      permissions: [...new Set([...recipient.permissions, "VIEW_OWN_FINANCIAL_INFORMATION"])],
      updatedAt: new Date(),
    }).where(eq(collaboratorsTable.id, recipient.id));
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "salary-record",
      entityId: salaryRecord.id,
      action: "created",
      details: { collaboratorId: recipient.id, periodLabel: salaryRecord.periodLabel, salaryStatus: salaryRecord.salaryStatus },
    });
    return { salaryRecord };
  });
  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }
  res.status(201).json(AssignCollaboratorSalaryRecordResponse.parse({ salaryRecord: result.salaryRecord }));
});

router.patch("/admin/salary-records/:id", async (req, res): Promise<void> => {
  const params = UpdateSalaryRecordParams.safeParse(req.params);
  const body = UpdateSalaryRecordBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "Invalid salary record update" });
    return;
  }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [existing] = await tx.select().from(financialRecordsTable)
      .where(eq(financialRecordsTable.id, params.data.id)).for("update").limit(1);
    if (!existing) return { error: "Salary record not found", status: 404 };
    const [recipient] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, existing.collaboratorId)).for("update").limit(1);
    if (!recipient || !canReceiveArrears(recipient.role)) {
      return { error: "Salary records cannot be assigned to an administrator", status: 400 };
    }
    const nextPeriod = body.data.periodLabel ?? existing.periodLabel;
    if (nextPeriod !== existing.periodLabel) {
      const [duplicate] = await tx.select({ id: financialRecordsTable.id })
        .from(financialRecordsTable)
        .where(and(
          eq(financialRecordsTable.collaboratorId, existing.collaboratorId),
          eq(financialRecordsTable.periodLabel, nextPeriod),
          ne(financialRecordsTable.id, existing.id),
        ))
        .limit(1);
      if (duplicate) return { error: "Another salary record already uses this period", status: 409 };
    }
    const [salaryRecord] = await tx.update(financialRecordsTable).set({
      ...body.data,
      communicatedDelayReason: body.data.communicatedDelayReason === undefined
        ? undefined
        : body.data.communicatedDelayReason?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(financialRecordsTable.id, existing.id)).returning();
    await tx.update(collaboratorsTable).set({
      permissions: [...new Set([...recipient.permissions, "VIEW_OWN_FINANCIAL_INFORMATION"])],
      updatedAt: new Date(),
    }).where(eq(collaboratorsTable.id, recipient.id));
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id,
      entityType: "salary-record",
      entityId: salaryRecord.id,
      action: "updated",
      details: { collaboratorId: recipient.id, fields: Object.keys(body.data) },
    });
    return { salaryRecord };
  });
  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }
  res.json(UpdateSalaryRecordResponse.parse({ salaryRecord: result.salaryRecord }));
});

export default router;