import { pgTable, text, serial, timestamp, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shipmentTypeEnum = pgEnum("shipment_type", ["parcel", "mineral"]);
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "collected",
  "in_transit",
  "customs",
  "out_for_delivery",
  "delivered",
  "exception",
]);

export const shipmentsTable = pgTable("shipments", {
  id: serial("id").primaryKey(),
  trackingCode: text("tracking_code").notNull().unique(),
  type: shipmentTypeEnum("type").notNull().default("parcel"),
  status: shipmentStatusEnum("status").notNull().default("pending"),

  senderName: text("sender_name").notNull(),
  senderCity: text("sender_city").notNull(),
  senderCountry: text("sender_country").notNull(),

  recipientName: text("recipient_name").notNull(),
  recipientCity: text("recipient_city").notNull(),
  recipientCountry: text("recipient_country").notNull(),

  description: text("description").notNull(),
  weight: text("weight"),
  dimensions: text("dimensions"),

  estimatedDelivery: text("estimated_delivery"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trackingEventsTable = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  shipmentId: serial("shipment_id").references(() => shipmentsTable.id, { onDelete: "cascade" }),
  status: shipmentStatusEnum("status").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isCompleted: boolean("is_completed").notNull().default(true),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrackingEventSchema = createInsertSchema(trackingEventsTable).omit({ id: true });

export type Shipment = typeof shipmentsTable.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type TrackingEvent = typeof trackingEventsTable.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;
