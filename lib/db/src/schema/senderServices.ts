import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const senderServicesTable = pgTable("workspace_sender_services", {
  id: serial("id").primaryKey(),
  systemKey: text("system_key").unique(),
  name: text("name").notNull().unique(),
  signature: text("signature").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertSenderServiceSchema = createInsertSchema(senderServicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type SenderService = typeof senderServicesTable.$inferSelect;