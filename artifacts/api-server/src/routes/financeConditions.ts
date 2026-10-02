import {
  activityLogsTable, arrearsTable, collaboratorsTable, db, financialRecordsTable, notificationsTable,
} from "@workspace/db";
import { ReportArrearConditionsParams, ReportArrearConditionsResponse, ReportSalaryConditionsParams, ReportSalaryConditionsResponse } from "@workspace/api-zod";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import { CONDITIONS_VERIFICATION_NOTICE, conditionsReportError } from "../lib/finance-conditions";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Actor = typeof collaboratorsTable.$inferSelect;

async function notifyAndAudit(tx: Transaction, current: Actor, period: string, kind: "arrear" | "salary-record", id: number) {
  const admins = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
    .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
  await tx.insert(notificationsTable).values([
    ...admins.map(admin => ({
      collaboratorId: admin.id,
      title: "Conditions signalées comme remplies",
      body: `${current.fullName} signale que les conditions sont remplies pour la période « ${period} ». Vérification requise.`,
    })),
    { collaboratorId: current.id, title: "Vérification en cours", body: CONDITIONS_VERIFICATION_NOTICE },
  ]);
  await tx.insert(activityLogsTable).values({
    collaboratorId: current.id, entityType: kind, entityId: id, action: "conditions_reported",
    details: { periodLabel: period },
  });
}

/** Mounted only after the workspace session/permission middleware. Legacy transfer URLs remain separate. */
export default function financeConditionsRouter(requirePermission: (permission: string) => RequestHandler): IRouter {
  const router = Router();
  router.post("/workspace/me/arrears/:id/conditions-report", requirePermission("VIEW_OWN_ARREARS"), async (req, res): Promise<void> => {
    const params = ReportArrearConditionsParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid arrear id" }); return; }
    const current = res.locals.workspaceActor as Actor;
    const result = await db.transaction(async tx => {
      const [record] = await tx.select().from(arrearsTable).where(and(
        eq(arrearsTable.id, params.data.id), eq(arrearsTable.collaboratorId, current.id),
      )).for("update").limit(1);
      if (!record) return { error: "Arrear not found", status: 404 };
      if (record.conditionsReportedAt) return { arrear: record, existing: true };
      const error = conditionsReportError("arrear", record.status, record.transferInstructions);
      if (error) return { error, status: 409 };
      const now = new Date();
      const [arrear] = await tx.update(arrearsTable).set({
        conditionsReportedAt: now, transferRequestedAt: record.transferRequestedAt ?? now,
        transferRequestStatus: "pending", updatedAt: now,
      }).where(eq(arrearsTable.id, record.id)).returning();
      await notifyAndAudit(tx, current, record.periodLabel, "arrear", record.id);
      return { arrear, existing: false };
    });
    if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
    res.status(result.existing ? 200 : 201).json(ReportArrearConditionsResponse.parse({ arrear: result.arrear }));
  });
  router.post("/workspace/me/salary-records/:id/conditions-report", requirePermission("VIEW_OWN_FINANCIAL_INFORMATION"), async (req, res): Promise<void> => {
    const params = ReportSalaryConditionsParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid salary record id" }); return; }
    const current = res.locals.workspaceActor as Actor;
    const result = await db.transaction(async tx => {
      const [record] = await tx.select().from(financialRecordsTable).where(and(
        eq(financialRecordsTable.id, params.data.id), eq(financialRecordsTable.collaboratorId, current.id),
      )).for("update").limit(1);
      if (!record) return { error: "Salary record not found", status: 404 };
      if (record.conditionsReportedAt) return { salaryRecord: record, existing: true };
      const error = conditionsReportError("salary", record.salaryStatus, record.transferInstructions);
      if (error) return { error, status: 409 };
      const now = new Date();
      const [salaryRecord] = await tx.update(financialRecordsTable).set({
        conditionsReportedAt: now, transferRequestedAt: record.transferRequestedAt ?? now,
        transferRequestStatus: "pending", updatedAt: now,
      }).where(eq(financialRecordsTable.id, record.id)).returning();
      await notifyAndAudit(tx, current, record.periodLabel, "salary-record", record.id);
      return { salaryRecord, existing: false };
    });
    if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
    res.status(result.existing ? 200 : 201).json(ReportSalaryConditionsResponse.parse({ salaryRecord: result.salaryRecord }));
  });
  return router;
}