import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { shipmentsTable, trackingEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── Validation ───────────────────────────────────────────────────────────────

const TrackingCodeSchema = z.object({
  code: z.string().min(3).max(60).toUpperCase(),
});

const InsertShipmentBody = z.object({
  trackingCode: z.string().min(3).max(60),
  type: z.enum(["parcel", "mineral"]).default("parcel"),
  status: z.enum(["pending","collected","in_transit","customs","out_for_delivery","delivered","exception"]).default("pending"),
  senderName: z.string().min(1).max(200),
  senderCity: z.string().min(1).max(200),
  senderCountry: z.string().min(1).max(200),
  recipientName: z.string().min(1).max(200),
  recipientCity: z.string().min(1).max(200),
  recipientCountry: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  weight: z.string().max(50).optional(),
  dimensions: z.string().max(100).optional(),
  estimatedDelivery: z.string().max(50).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const InsertEventBody = z.object({
  shipmentId: z.number().int().positive(),
  status: z.enum(["pending","collected","in_transit","customs","out_for_delivery","delivered","exception"]),
  location: z.string().min(1).max(300),
  description: z.string().min(1).max(500),
  timestamp: z.string().optional(),
  isCompleted: z.boolean().default(true),
});

// ── Public: track by code ────────────────────────────────────────────────────

router.get("/tracking/:code", async (req: Request, res: Response) => {
  const parsed = TrackingCodeSchema.safeParse({ code: req.params.code });
  if (!parsed.success) {
    res.status(400).json({ error: "Code de suivi invalide." });
    return;
  }

  const { code } = parsed.data;

  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.trackingCode, code));

  if (!shipment) {
    res.status(404).json({ error: "Aucun envoi trouvé pour ce code de suivi." });
    return;
  }

  const events = await db
    .select()
    .from(trackingEventsTable)
    .where(eq(trackingEventsTable.shipmentId, shipment.id))
    .orderBy(trackingEventsTable.timestamp);

  res.json({ shipment, events });
});

// ── Admin middleware ─────────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }
  const token = auth.slice(7);
  const expected = process.env["JWT_SECRET"] + "_admin_token";
  if (token !== expected) {
    res.status(403).json({ error: "Accès refusé." });
    return;
  }
  next();
}

// ── Admin: login ─────────────────────────────────────────────────────────────

router.post("/admin/login", (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminPassword) {
    res.status(503).json({ error: "Admin non configuré." });
    return;
  }
  if (password !== adminPassword) {
    res.status(401).json({ error: "Mot de passe incorrect." });
    return;
  }
  const token = process.env["JWT_SECRET"] + "_admin_token";
  res.json({ token });
});

// ── Admin: list all shipments ─────────────────────────────────────────────────

router.get("/admin/shipments", requireAdmin as any, async (_req: Request, res: Response) => {
  const shipments = await db
    .select()
    .from(shipmentsTable)
    .orderBy(shipmentsTable.createdAt);
  res.json({ shipments });
});

// ── Admin: create shipment ────────────────────────────────────────────────────

router.post("/admin/shipments", requireAdmin as any, async (req: Request, res: Response) => {
  const parsed = InsertShipmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const code = data.trackingCode.toUpperCase().replace(/\s/g, "");

  const [existing] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.trackingCode, code));

  if (existing) {
    res.status(409).json({ error: "Ce code de suivi existe déjà." });
    return;
  }

  const [shipment] = await db
    .insert(shipmentsTable)
    .values({ ...data, trackingCode: code })
    .returning();

  // Create initial event
  await db.insert(trackingEventsTable).values({
    shipmentId: shipment.id,
    status: data.status,
    location: `${data.senderCity}, ${data.senderCountry}`,
    description: "Envoi enregistré par SOMIREN Logistics",
    isCompleted: true,
  });

  res.status(201).json({ shipment });
});

// ── Admin: update shipment ────────────────────────────────────────────────────

router.put("/admin/shipments/:id", requireAdmin as any, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide." }); return; }

  const parsed = InsertShipmentBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }

  const [shipment] = await db
    .update(shipmentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(shipmentsTable.id, id))
    .returning();

  if (!shipment) { res.status(404).json({ error: "Envoi introuvable." }); return; }

  // If status changed, sync the most recent tracking event to match
  if (parsed.data.status) {
    const [latestEvent] = await db
      .select()
      .from(trackingEventsTable)
      .where(eq(trackingEventsTable.shipmentId, id))
      .orderBy(desc(trackingEventsTable.timestamp))
      .limit(1);

    if (latestEvent) {
      await db
        .update(trackingEventsTable)
        .set({ status: parsed.data.status })
        .where(eq(trackingEventsTable.id, latestEvent.id));
    }
  }

  res.json({ shipment });
});

// ── Admin: delete shipment ────────────────────────────────────────────────────

router.delete("/admin/shipments/:id", requireAdmin as any, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide." }); return; }

  await db.delete(shipmentsTable).where(eq(shipmentsTable.id, id));
  res.json({ success: true });
});

// ── Admin: add tracking event ─────────────────────────────────────────────────

router.post("/admin/events", requireAdmin as any, async (req: Request, res: Response) => {
  const parsed = InsertEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const eventData: any = {
    shipmentId: data.shipmentId,
    status: data.status,
    location: data.location,
    description: data.description,
    isCompleted: data.isCompleted,
  };
  if (data.timestamp) {
    eventData.timestamp = new Date(data.timestamp);
  }

  const [event] = await db
    .insert(trackingEventsTable)
    .values(eventData)
    .returning();

  // Update shipment status to match latest event
  await db
    .update(shipmentsTable)
    .set({ status: data.status, updatedAt: new Date() })
    .where(eq(shipmentsTable.id, data.shipmentId));

  res.status(201).json({ event });
});

// ── Admin: update event ───────────────────────────────────────────────────────

router.put("/admin/events/:id", requireAdmin as any, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide." }); return; }

  const { status, location, description, timestamp, isCompleted } = req.body;
  const updateData: any = {};
  if (status)      updateData.status = status;
  if (location)    updateData.location = location;
  if (description) updateData.description = description;
  if (typeof isCompleted === "boolean") updateData.isCompleted = isCompleted;
  if (timestamp)   updateData.timestamp = new Date(timestamp);

  const [updated] = await db
    .update(trackingEventsTable)
    .set(updateData)
    .where(eq(trackingEventsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Événement introuvable." }); return; }
  res.json({ event: updated });
});

// ── Admin: delete event ───────────────────────────────────────────────────────

router.delete("/admin/events/:id", requireAdmin as any, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID invalide." }); return; }

  await db.delete(trackingEventsTable).where(eq(trackingEventsTable.id, id));
  res.json({ success: true });
});

export default router;
