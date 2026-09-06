import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const collaboratorsTable = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const collaboratorSessionsTable = pgTable("collaborator_sessions", {
  id: serial("id").primaryKey(),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  category: text("category").notNull().default("general"),
  confidentiality: text("confidentiality").notNull().default("private"),
  uploadedById: integer("uploaded_by_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }),
  ...timestamps,
});

export const documentAssignmentsTable = pgTable("workspace_document_assignments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  instruction: text("instruction"),
  priority: text("priority").notNull().default("normal"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: text("status").notNull().default("received"),
  ...timestamps,
});

export const executiveRequestsTable = pgTable("workspace_executive_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), description: text("description").notNull().default(""),
  status: text("status").notNull().default("new"), priority: text("priority").notNull().default("normal"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  assigneeId: integer("assignee_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }),
  ...timestamps,
});
export const meetingsTable = pgTable("workspace_meetings", {
  id: serial("id").primaryKey(), title: text("title").notNull(), description: text("description").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }),
  headquartersTimezone: text("headquarters_timezone").notNull().default("Europe/Madrid"), meetingUrl: text("meeting_url"), ...timestamps,
});
export const meetingParticipantsTable = pgTable("workspace_meeting_participants", {
  id: serial("id").primaryKey(), meetingId: integer("meeting_id").notNull().references(() => meetingsTable.id, { onDelete: "cascade" }),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }), ...timestamps,
});
export const conversationsTable = pgTable("workspace_conversations", {
  id: serial("id").primaryKey(), subject: text("subject").notNull(), collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }), ...timestamps,
});
export const messagesTable = pgTable("workspace_messages", {
  id: serial("id").primaryKey(), conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }), body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const strategicNotesTable = pgTable("workspace_strategic_notes", {
  id: serial("id").primaryKey(), title: text("title").notNull(), body: text("body").notNull().default(""), isShared: boolean("is_shared").notNull().default(false),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }), ...timestamps,
});
export const contactsTable = pgTable("workspace_contacts", {
  id: serial("id").primaryKey(), fullName: text("full_name").notNull(), email: text("email"), phone: text("phone"), organization: text("organization"), collaboratorId: integer("collaborator_id").references(() => collaboratorsTable.id, { onDelete: "cascade" }), ...timestamps,
});
export const financialRecordsTable = pgTable("workspace_financial_records", {
  id: serial("id").primaryKey(), collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  salaryStatus: text("salary_status").notNull(), periodLabel: text("period_label").notNull(), communicatedDelayReason: text("communicated_delay_reason"), ...timestamps,
});
export const paymentsTable = pgTable("workspace_payments", {
  id: serial("id").primaryKey(), collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  periodLabel: text("period_label").notNull(), status: text("status").notNull(), paidAt: timestamp("paid_at", { withTimezone: true }), ...timestamps,
});
export const arrearsTable = pgTable("workspace_arrears", {
  id: serial("id").primaryKey(), collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  periodLabel: text("period_label").notNull(), status: text("status").notNull(), communicatedReason: text("communicated_reason"), ...timestamps,
});
export const paymentRequirementsTable = pgTable("workspace_payment_requirements", {
  id: serial("id").primaryKey(), collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(), details: text("details").notNull().default(""), status: text("status").notNull().default("pending"), ...timestamps,
});
export const paymentRequirementDocumentsTable = pgTable("workspace_payment_requirement_documents", {
  id: serial("id").primaryKey(), requirementId: integer("requirement_id").notNull().references(() => paymentRequirementsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(), objectPath: text("object_path"), contentType: text("content_type"), submittedById: integer("submitted_by_id").notNull().references(() => collaboratorsTable.id, { onDelete: "restrict" }), ...timestamps,
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