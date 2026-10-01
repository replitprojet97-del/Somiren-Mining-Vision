import {
  conversationsTable,
  db,
  messagesTable,
  workspaceMessageReadCursorsTable,
} from "@workspace/db";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  GetWorkspaceUnreadMessageCountResponse, MarkWorkspaceConversationReadBody,
  MarkWorkspaceConversationReadParams, MarkWorkspaceConversationReadResponse,
} from "@workspace/api-zod";
import { getWorkspaceActor } from "./collaboratorAuth";

const router: IRouter = Router();

type WorkspaceActor = NonNullable<Awaited<ReturnType<typeof getWorkspaceActor>>>;

async function requireMessagingAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const current = await getWorkspaceActor(req);
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!current.permissions.includes("workspace:read")) {
      res.status(403).json({ error: "Permission de lecture requise." });
      return;
    }
    if (!current.permissions.includes("USE_INTERNAL_MESSAGING")) {
      res.status(403).json({ error: "Permission USE_INTERNAL_MESSAGING requise." });
      return;
    }
    res.locals.workspaceMessageReadActor = current;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Message read authorization failed");
    res.status(503).json({ error: "Workspace authorization is temporarily unavailable" });
  }
}

function actor(res: Response): WorkspaceActor {
  return res.locals.workspaceMessageReadActor as WorkspaceActor;
}

router.get("/workspace/messages/unread-count", requireMessagingAccess, async (_req, res): Promise<void> => {
  const current = actor(res);
  try {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    }).from(messagesTable)
      .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
      .leftJoin(workspaceMessageReadCursorsTable, and(
        eq(workspaceMessageReadCursorsTable.conversationId, conversationsTable.id),
        eq(workspaceMessageReadCursorsTable.collaboratorId, current.id),
      ))
      .where(and(
        eq(conversationsTable.collaboratorId, current.id),
        ne(messagesTable.senderId, current.id),
        gt(messagesTable.id, sql`coalesce(${workspaceMessageReadCursorsTable.lastReadMessageId}, 0)`),
      ));
    res.json(GetWorkspaceUnreadMessageCountResponse.parse({ count: result?.count ?? 0 }));
  } catch (error) {
    _req.log.error({ err: error }, "Unread message count failed");
    res.status(503).json({ error: "Could not load unread messages" });
  }
});

router.patch("/workspace/conversations/:id/read", requireMessagingAccess, async (req, res): Promise<void> => {
  const conversationId = MarkWorkspaceConversationReadParams.safeParse(req.params);
  const body = MarkWorkspaceConversationReadBody.strict().safeParse(req.body);
  if (!conversationId.success || !body.success) {
    res.status(400).json({ error: "A valid conversation id and lastReadMessageId are required" });
    return;
  }

  const current = actor(res);
  try {
    const result = await db.transaction(async tx => {
      const [conversation] = await tx.select({ id: conversationsTable.id })
        .from(conversationsTable)
        .where(and(
          eq(conversationsTable.id, conversationId.data.id),
          eq(conversationsTable.collaboratorId, current.id),
        )).limit(1);
      if (!conversation) return { notFound: true as const };

      const [visibleMessage] = await tx.select({ id: messagesTable.id })
        .from(messagesTable)
        .where(and(
          eq(messagesTable.id, body.data.lastReadMessageId),
          eq(messagesTable.conversationId, conversationId.data.id),
        )).limit(1);
      if (!visibleMessage) return { invalidMessage: true as const };

      const [cursor] = await tx.insert(workspaceMessageReadCursorsTable).values({
        conversationId: conversationId.data.id,
        collaboratorId: current.id,
        lastReadMessageId: visibleMessage.id,
      }).onConflictDoUpdate({
        target: [
          workspaceMessageReadCursorsTable.conversationId,
          workspaceMessageReadCursorsTable.collaboratorId,
        ],
        set: {
          lastReadMessageId: sql`GREATEST(${workspaceMessageReadCursorsTable.lastReadMessageId}, EXCLUDED.last_read_message_id)`,
          updatedAt: new Date(),
        },
      }).returning({ lastReadMessageId: workspaceMessageReadCursorsTable.lastReadMessageId });

      return { lastReadMessageId: cursor.lastReadMessageId };
    });

    if ("notFound" in result) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if ("invalidMessage" in result) {
      res.status(400).json({ error: "The read cursor must refer to a message in this conversation" });
      return;
    }
    res.json(MarkWorkspaceConversationReadResponse.parse({ updated: true, lastReadMessageId: result.lastReadMessageId }));
  } catch (error) {
    req.log.error({ err: error }, "Conversation read cursor update failed");
    res.status(503).json({ error: "Could not mark conversation messages as read" });
  }
});

export default router;