import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const collaboratorsTable = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const casesTable = pgTable("workspace_cases", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().default("DEMO"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull().default(""),
  instructions: text("instructions"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("normal"),
  progress: integer("progress").notNull().default(0),
  notes: text("notes"),
  assigneeId: integer("assignee_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }),
  ...timestamps,
});

export const tasksTable = pgTable("workspace_tasks", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  comment: text("comment"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("normal"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  assigneeId: integer("assignee_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }),
  ...timestamps,
});

export const documentsTable = pgTable("workspace_documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => casesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  contentType: text("content_type"),
  objectPath: text("object_path"),
  uploadedById: integer("uploaded_by_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }),
  ...timestamps,
});

export const notificationsTable = pgTable("workspace_notifications", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  ...timestamps,
});

export const activityLogsTable = pgTable("workspace_activity_logs", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  action: text("action").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const videoAuthorizationsTable = pgTable("workspace_video_authorizations", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  meetingTitle: text("meeting_title").notNull(),
  meetingUrl: text("meeting_url").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isRevoked: boolean("is_revoked").notNull().default(false),
  ...timestamps,
});

export const insertCollaboratorSchema = createInsertSchema(collaboratorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Collaborator = typeof collaboratorsTable.$inferSelect;
export type WorkspaceCase = typeof casesTable.$inferSelect;
export type WorkspaceTask = typeof tasksTable.$inferSelect;
export type WorkspaceDocument = typeof documentsTable.$inferSelect;
export type WorkspaceNotification = typeof notificationsTable.$inferSelect;