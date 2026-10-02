import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CreateAdminTaskBody, UpdateAdminTaskBody, UpdateWorkspaceTaskBody,
} from "@workspace/api-zod";

test("assignment requires a title and a positive integral collaborator id", () => {
  assert.equal(CreateAdminTaskBody.safeParse({ title: "Suivi", assigneeId: 12 }).success, true);
  for (const input of [
    { title: "", assigneeId: 12 }, { title: "Suivi" },
    { title: "Suivi", assigneeId: 0 }, { title: "Suivi", assigneeId: 1.2 },
    { title: "Suivi", assigneeId: "12" }, { title: "x".repeat(301), assigneeId: 12 },
  ]) assert.equal(CreateAdminTaskBody.safeParse(input).success, false);
});

test("assignment accepts an optional case, real deadline and controlled statuses", () => {
  const result = CreateAdminTaskBody.parse({
    title: "Contrôler les pièces", assigneeId: 12, caseId: null,
    dueAt: "2026-10-20T09:00:00Z", priority: "urgent", description: "Vérifier les annexes.",
  });
  assert.ok(result.dueAt instanceof Date);
  assert.equal(result.caseId, null);
  for (const input of [{ dueAt: "invalid" }, { caseId: -1 }, { priority: "unknown" }, { status: "unknown" }]) {
    assert.equal(CreateAdminTaskBody.safeParse({ title: "Suivi", assigneeId: 12, ...input }).success, false);
  }
});

test("admin can reassign and clear the linked case or deadline", () => {
  const result = UpdateAdminTaskBody.parse({ assigneeId: 13, caseId: null, dueAt: null });
  assert.equal(result.assigneeId, 13);
  assert.equal(result.caseId, null);
  assert.equal(result.dueAt, null);
});

test("collaborator updates are restricted to status and a clearable comment", () => {
  for (const status of ["todo", "in_progress", "blocked", "completed"]) {
    assert.equal(UpdateWorkspaceTaskBody.safeParse({ status }).success, true);
  }
  assert.equal(UpdateWorkspaceTaskBody.safeParse({ comment: "" }).success, true);
  assert.equal(UpdateWorkspaceTaskBody.safeParse({ comment: null }).success, true);
  assert.equal(UpdateWorkspaceTaskBody.safeParse({ comment: "x".repeat(2001) }).success, false);
  assert.deepEqual(UpdateWorkspaceTaskBody.parse({ status: "completed", assigneeId: 99, caseId: 15 }), { status: "completed" });
});