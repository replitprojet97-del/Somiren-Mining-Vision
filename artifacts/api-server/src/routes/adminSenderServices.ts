import { activityLogsTable, db, senderServicesTable } from "@workspace/db";
import { CreateSenderServiceBody, UpdateSenderServiceBody, UpdateSenderServiceParams } from "@workspace/api-zod";
import { asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { requireAdminAccess } from "./adminWorkspace";

const router: IRouter = Router();
router.use("/admin/sender-services", requireAdminAccess, (_req, res, next) => {
  if (res.locals.adminActor.role !== "ADMIN") { res.status(403).json({ error: "Administrator role required" }); return; }
  next();
});

function isDuplicate(error: unknown): boolean {
  const value = error as { code?: string; cause?: { code?: string } };
  return value?.code === "23505" || value?.cause?.code === "23505";
}

router.get("/admin/sender-services", async (_req, res) => {
  const services = await db.select().from(senderServicesTable).orderBy(asc(senderServicesTable.id));
  res.json({ services });
});
router.post("/admin/sender-services", async (req, res) => {
  const parsed = CreateSenderServiceBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim()) { res.status(400).json({ error: "Invalid service" }); return; }
  try {
    const service = await db.transaction(async tx => {
      const [created] = await tx.insert(senderServicesTable).values({
        name: parsed.data.name.trim(), signature: parsed.data.signature?.trim() ?? "",
      }).returning();
      await tx.insert(activityLogsTable).values({
        collaboratorId: res.locals.adminActor.id, entityType: "sender-service", entityId: created.id,
        action: "created", details: { name: created.name },
      });
      return created;
    });
    res.status(201).json({ service });
  } catch (error) {
    if (isDuplicate(error)) { res.status(409).json({ error: "A service with this name already exists" }); return; }
    throw error;
  }
});
router.patch("/admin/sender-services/:id", async (req, res) => {
  const params = UpdateSenderServiceParams.safeParse(req.params);
  const parsed = UpdateSenderServiceBody.safeParse(req.body);
  if (!params.success || !parsed.success || !Object.keys(parsed.data).length || (parsed.data.name !== undefined && !parsed.data.name.trim())) {
    res.status(400).json({ error: "Invalid service update" }); return;
  }
  try {
    const service = await db.transaction(async tx => {
      const [updated] = await tx.update(senderServicesTable).set({
        ...parsed.data, name: parsed.data.name?.trim(), signature: parsed.data.signature?.trim(), updatedAt: new Date(),
      }).where(eq(senderServicesTable.id, params.data.id)).returning();
      if (!updated) return null;
      await tx.insert(activityLogsTable).values({
        collaboratorId: res.locals.adminActor.id, entityType: "sender-service", entityId: updated.id,
        action: "updated", details: { fields: Object.keys(parsed.data) },
      });
      return updated;
    });
    if (!service) { res.status(404).json({ error: "Service not found" }); return; }
    res.json({ service });
  } catch (error) {
    if (isDuplicate(error)) { res.status(409).json({ error: "A service with this name already exists" }); return; }
    throw error;
  }
});
export default router;