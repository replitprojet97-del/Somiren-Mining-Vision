import {
  activityLogsTable, arrearsTable, collaboratorsTable, db, notificationsTable,
} from "@workspace/db";
import {
  CreateCollaboratorArrearBody, CreateCollaboratorArrearParams, CreateCollaboratorArrearResponse,
  DeleteArrearParams, ListCollaboratorArrearsParams, ListCollaboratorArrearsResponse,
  UpdateArrearBody, UpdateArrearParams, UpdateArrearResponse,
} from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdminAccess } from "./adminWorkspace";
import {
  canManageConfidentialFinance, canReceiveArrears, mergeArrearsVisibilityPermissions,
} from "./adminCollaboratorPolicy";

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

router.get("/admin/collaborators/:collaboratorId/arrears", async (req, res): Promise<void> => {
  const params = ListCollaboratorArrearsParams.safeParse(req.params);
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
  const arrears = await db.select().from(arrearsTable)
    .where(eq(arrearsTable.collaboratorId, collaborator.id)).orderBy(desc(arrearsTable.createdAt));
  res.json(ListCollaboratorArrearsResponse.parse({ arrears }));
});

router.post("/admin/collaborators/:collaboratorId/arrears", async (req, res): Promise<void> => {
  const params = CreateCollaboratorArrearParams.safeParse(req.params);
  const body = CreateCollaboratorArrearBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid arrear details" });
    return;
  }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [recipient] = await tx.select().from(collaboratorsTable)
      .where(eq(collaboratorsTable.id, params.data.collaboratorId)).for("update").limit(1);
    if (!recipient || !canReceiveArrears(recipient.role)) return { error: "A non-administrator collaborator is required", status: 400 };
    const [arrear] = await tx.insert(arrearsTable).values({
      collaboratorId: recipient.id,
      periodLabel: body.data.periodLabel,
      amount: body.data.amount,
      currency: body.data.currency,
      communicatedReason: body.data.communicatedReason,
      transferInstructions: body.data.transferInstructions,
      payrollServiceName: body.data.payrollServiceName?.trim() || "Service paie",
      payrollServiceSignature: body.data.payrollServiceSignature?.trim(),
      status: body.data.status ?? "open",
    }).returning();
    await tx.update(collaboratorsTable).set({
      permissions: mergeArrearsVisibilityPermissions(recipient.permissions),
      updatedAt: new Date(),
    }).where(eq(collaboratorsTable.id, recipient.id));
    await tx.insert(notificationsTable).values({
      collaboratorId: recipient.id,
      title: "Nouvel arriéré communiqué",
      body: `Un arriéré relatif à ${arrear.periodLabel} est disponible dans votre espace financier.`,
    });
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "arrear", entityId: arrear.id, action: "created",
      details: { collaboratorId: recipient.id, periodLabel: arrear.periodLabel },
    });
    return { arrear };
  });
  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }
  res.status(201).json(CreateCollaboratorArrearResponse.parse({ arrear: result.arrear }));
});

router.patch("/admin/arrears/:id", async (req, res): Promise<void> => {
  const params = UpdateArrearParams.safeParse(req.params);
  const body = UpdateArrearBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "Invalid arrear update" });
    return;
  }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [arrear] = await tx.select().from(arrearsTable)
      .where(eq(arrearsTable.id, params.data.id)).for("update").limit(1);
    if (!arrear) return { error: "Arrear not found", status: 404 };
    if (body.data.payrollServiceName !== undefined && !body.data.payrollServiceName.trim()) {
      return { error: "Payroll service name is required", status: 400 };
    }
    if (body.data.transferRequestStatus && arrear.transferRequestStatus !== "pending") {
      return { error: "Only a pending transfer request can be reviewed", status: 409 };
    }
    const definitionChanged = Object.keys(body.data).some(key => key !== "transferRequestStatus");
    if (definitionChanged) {
      const [recipient] = await tx.select().from(collaboratorsTable)
        .where(eq(collaboratorsTable.id, arrear.collaboratorId)).for("update").limit(1);
      if (!recipient || !canReceiveArrears(recipient.role)) {
        return { error: "Arrears cannot be assigned to an administrator", status: 400 };
      }
      await tx.update(collaboratorsTable).set({
        permissions: mergeArrearsVisibilityPermissions(recipient.permissions),
        updatedAt: new Date(),
      }).where(eq(collaboratorsTable.id, recipient.id));
    }
    const patch = { ...body.data, updatedAt: new Date() };
    const [updated] = await tx.update(arrearsTable).set(patch)
      .where(eq(arrearsTable.id, arrear.id)).returning();
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "arrear", entityId: updated.id, action: "updated",
      details: { fields: Object.keys(body.data) },
    });
    return { arrear: updated };
  });
  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }
  res.json(UpdateArrearResponse.parse({ arrear: result.arrear }));
});

router.delete("/admin/arrears/:id", async (req, res): Promise<void> => {
  const params = DeleteArrearParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid arrear id" });
    return;
  }
  const current = actor(res);
  const result = await db.transaction(async tx => {
    const [arrear] = await tx.select().from(arrearsTable)
      .where(eq(arrearsTable.id, params.data.id)).for("update").limit(1);
    if (!arrear) return { error: "Arrear not found", status: 404 };
    if (arrear.transferRequestedAt || arrear.transferRequestStatus) {
      return { error: "An arrear with a transfer request cannot be deleted; archive it instead", status: 409 };
    }
    await tx.delete(arrearsTable).where(eq(arrearsTable.id, arrear.id));
    await tx.insert(activityLogsTable).values({
      collaboratorId: current.id, entityType: "arrear", entityId: arrear.id, action: "deleted",
      details: { collaboratorId: arrear.collaboratorId, periodLabel: arrear.periodLabel },
    });
    return { deleted: true };
  });
  if ("error" in result) {
    res.status(result.status ?? 400).json({ error: result.error });
    return;
  }
  res.status(204).end();
});

export default router;