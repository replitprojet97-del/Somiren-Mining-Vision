import { integer, pgTable, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { collaboratorsTable, conversationsTable } from "./workspace";

export const workspaceMessageReadCursorsTable = pgTable("workspace_message_read_cursors", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  collaboratorId: integer("collaborator_id").notNull().references(() => collaboratorsTable.id, { onDelete: "cascade" }),
  lastReadMessageId: integer("last_read_message_id").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  conversationCollaboratorUnique: uniqueIndex("workspace_message_read_cursors_conversation_collaborator_unique")
    .on(table.conversationId, table.collaboratorId),
}));

export type WorkspaceMessageReadCursor = typeof workspaceMessageReadCursorsTable.$inferSelect;