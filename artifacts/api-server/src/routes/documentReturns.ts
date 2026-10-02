import { and, desc, eq } from "drizzle-orm";
import { Router, type RequestHandler, type Response } from "express";
import {
  activityLogsTable, collaboratorsTable, db, documentAssignmentsTable, documentReturnsTable,
  documentsTable, notificationsTable, privateUploadsTable,
} from "@workspace/db";
import { ReturnReceivedDocumentBody, ReturnReceivedDocumentParams } from "@workspace/api-zod";
import { z } from "zod";
import { consumeUpload, createDownloadUrl, getConsumedAsset } from "./privateMedia";

const idSchema = z.coerce.number().int().positive();
type Actor = typeof collaboratorsTable.$inferSelect;

function returnSelection() {
  return {
    id: documentReturnsTable.id,
    assignmentId: documentReturnsTable.assignmentId,
    assetId: documentReturnsTable.assetId,
    comment: documentReturnsTable.comment,
    submittedAt: documentReturnsTable.submittedAt,
    fileName: privateUploadsTable.fileName,
    contentType: privateUploadsTable.contentType,
    fileSize: privateUploadsTable.size,
  };
}

export async function documentReturnHistory(collaboratorId: number) {
  const rows = await db.select(returnSelection()).from(documentReturnsTable)
    .innerJoin(documentAssignmentsTable, eq(documentReturnsTable.assignmentId, documentAssignmentsTable.id))
    .innerJoin(privateUploadsTable, eq(documentReturnsTable.assetId, privateUploadsTable.id))
    .where(eq(documentAssignmentsTable.collaboratorId, collaboratorId))
    .orderBy(desc(documentReturnsTable.submittedAt), desc(documentReturnsTable.id));
  return rows.map(row => ({ ...row, downloadPath: `/workspace/documents/returns/${row.id}/file` }));
}

async function sendFile(res: Response, assetId: string): Promise<void> {
  const asset = await getConsumedAsset(assetId, "document-return");
  if (!asset) { res.status(404).json({ error: "Returned document attachment not found" }); return; }
  const url = await createDownloadUrl(asset);
  if (!url) { res.status(502).json({ error: "Could not create a file download URL" }); return; }
  res.json({ url, fileName: asset.fileName, contentType: asset.contentType, expiresIn: 300 });
}

export function workspaceDocumentReturnsRouter(requirePermission: (permission: string) => RequestHandler) {
  const router = Router();
  router.post("/workspace/documents/received/:id/returns", requirePermission("SUBMIT_DOCUMENTS"), async (req, res): Promise<void> => {
    const params = ReturnReceivedDocumentParams.safeParse(req.params);
    const body = ReturnReceivedDocumentBody.strict().safeParse(req.body);
    if (!params.success || !body.success) { res.status(400).json({ error: "Invalid document return" }); return; }
    const current = res.locals.workspaceActor as Actor;
    const result = await db.transaction(async tx => {
      // Serialize returns for an assignment; retrying the same uploaded asset must not notify twice.
      const [assignment] = await tx.select().from(documentAssignmentsTable).where(and(
        eq(documentAssignmentsTable.id, params.data.id),
        eq(documentAssignmentsTable.collaboratorId, current.id),
      )).for("update").limit(1);
      if (!assignment) return { error: "Document assignment not found", status: 404 };
      const [existing] = await tx.select(returnSelection()).from(documentReturnsTable)
        .innerJoin(privateUploadsTable, eq(documentReturnsTable.assetId, privateUploadsTable.id))
        .where(and(eq(documentReturnsTable.assignmentId, assignment.id), eq(documentReturnsTable.assetId, body.data.assetId)))
        .limit(1);
      if (existing) return { returnedDocument: existing };
      const [document] = await tx.select({ title: documentsTable.title }).from(documentsTable)
        .where(eq(documentsTable.id, assignment.documentId)).limit(1);
      const admins = await tx.select({ id: collaboratorsTable.id }).from(collaboratorsTable)
        .where(and(eq(collaboratorsTable.role, "ADMIN"), eq(collaboratorsTable.isActive, true)));
      if (!admins.length) return { error: "Management notifications are temporarily unavailable", status: 503 };
      const asset = await consumeUpload(tx, body.data.assetId, current.id, "document", "document-return");
      if (!asset) return { error: "Return attachment must be a completed document uploaded by this collaborator", status: 400 };
      const [returned] = await tx.insert(documentReturnsTable).values({
        assignmentId: assignment.id, assetId: asset.id, comment: body.data.comment?.trim() || null,
      }).returning();
      await tx.update(documentAssignmentsTable).set({ status: "submitted", updatedAt: returned.submittedAt })
        .where(eq(documentAssignmentsTable.id, assignment.id));
      await tx.insert(notificationsTable).values(admins.map(admin => ({
        collaboratorId: admin.id,
        title: "Document traité retourné",
        body: `${current.fullName} a renvoyé « ${document.title} ». Le fichier et son commentaire sont disponibles dans les documents retournés à la Direction.`,
      })));
      await tx.insert(activityLogsTable).values({
        collaboratorId: current.id, entityType: "document_assignment", entityId: assignment.id,
        action: "document_returned", details: { returnId: returned.id },
      });
      return { returnedDocument: { ...returned, fileName: asset.fileName, contentType: asset.contentType, fileSize: asset.size } };
    });
    if ("error" in result) { res.status(result.status ?? 400).json({ error: result.error }); return; }
    res.status(201).json({ returnedDocument: {
      ...result.returnedDocument, downloadPath: `/workspace/documents/returns/${result.returnedDocument.id}/file`,
    } });
  });
  router.get("/workspace/documents/returns/:id/file", requirePermission("VIEW_ASSIGNED_DOCUMENTS"), async (req, res): Promise<void> => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) { res.status(400).json({ error: "Invalid return id" }); return; }
    const current = res.locals.workspaceActor as Actor;
    const [returned] = await db.select({ assetId: documentReturnsTable.assetId }).from(documentReturnsTable)
      .innerJoin(documentAssignmentsTable, eq(documentReturnsTable.assignmentId, documentAssignmentsTable.id))
      .where(and(eq(documentReturnsTable.id, id.data), eq(documentAssignmentsTable.collaboratorId, current.id))).limit(1);
    if (!returned) { res.status(404).json({ error: "Returned document not found" }); return; }
    await sendFile(res, returned.assetId);
  });
  return router;
}

export function adminDocumentReturnsRouter(requireConfidentialAdmin: RequestHandler) {
  const router = Router();
  router.get("/admin/document-returns", requireConfidentialAdmin, async (_req, res): Promise<void> => {
    const rows = await db.select({
      ...returnSelection(), documentTitle: documentsTable.title, collaboratorName: collaboratorsTable.fullName,
      originalDocument: documentsTable,
    }).from(documentReturnsTable)
      .innerJoin(documentAssignmentsTable, eq(documentReturnsTable.assignmentId, documentAssignmentsTable.id))
      .innerJoin(documentsTable, eq(documentAssignmentsTable.documentId, documentsTable.id))
      .innerJoin(collaboratorsTable, eq(documentAssignmentsTable.collaboratorId, collaboratorsTable.id))
      .innerJoin(privateUploadsTable, eq(documentReturnsTable.assetId, privateUploadsTable.id))
      .orderBy(desc(documentReturnsTable.submittedAt), desc(documentReturnsTable.id));
    res.json({ returns: rows.map(row => ({
      ...row, downloadPath: `/admin/document-returns/${row.id}/file`,
      originalDocument: {
        ...row.originalDocument,
        downloadPath: row.originalDocument.assetId ? `/admin/document-assignments/${row.assignmentId}/file` : null,
      },
    })) });
  });
  router.get("/admin/document-returns/:id/file", requireConfidentialAdmin, async (req, res): Promise<void> => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) { res.status(400).json({ error: "Invalid return id" }); return; }
    const [returned] = await db.select().from(documentReturnsTable).where(eq(documentReturnsTable.id, id.data)).limit(1);
    if (!returned) { res.status(404).json({ error: "Returned document not found" }); return; }
    await sendFile(res, returned.assetId);
  });
  return router;
}