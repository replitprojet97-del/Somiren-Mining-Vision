import assert from "node:assert/strict";
import test from "node:test";
import {
  addsUserManagementPermissions,
  canManageConfidentialFinance,
  canReceiveArrears,
  mergeArrearsVisibilityPermissions,
  canAssignCollaboratorAccess,
  deriveRolePermissions,
  hasSupportedRolePermissions,
  isUserManager,
  isProtectedCollaboratorAccount,
  isSelfRoleDemotion,
  isReservedAdminRoleRename,
  mergeWorkspaceReadPermission,
  normalizeCollaboratorEmail,
} from "./adminCollaboratorPolicy";

test("collaborator email is canonicalized before uniqueness checks and insertion", () => {
  assert.equal(normalizeCollaboratorEmail("  Person.Name@Example.COM "), "person.name@example.com");
});

test("only ADMIN or MANAGE_USERS can manage collaborators", () => {
  assert.equal(isUserManager({ role: "ADMIN", permissions: [] }), true);
  assert.equal(isUserManager({ role: "COLLABORATOR", permissions: ["MANAGE_USERS"] }), true);
  assert.equal(isUserManager({ role: "COLLABORATOR", permissions: ["MANAGE_PERMISSIONS"] }), false);
  assert.equal(isUserManager({ role: "COLLABORATOR", permissions: [] }), false);
});

test("bootstrap and ADMIN accounts are protected from non-admin collaborator edits", () => {
  assert.equal(isProtectedCollaboratorAccount("ADMIN", "other@example.com", []), true);
  assert.equal(isProtectedCollaboratorAccount("COLLABORATOR", " ADMIN@SOMIREN.LOCAL ", []), true);
  assert.equal(isProtectedCollaboratorAccount("COLLABORATOR", "person@example.com", []), false);
});

test("non-admin managers cannot modify accounts with effective user-management permissions", () => {
  assert.equal(isProtectedCollaboratorAccount("COLLABORATOR", "users@example.com", ["MANAGE_USERS"]), true);
  assert.equal(isProtectedCollaboratorAccount("COLLABORATOR", "permissions@example.com", ["MANAGE_PERMISSIONS"]), true);
  assert.equal(isProtectedCollaboratorAccount("COLLABORATOR", "regular@example.com", ["workspace:read"]), false);
});

test("role permissions are preserved and workspace read is guaranteed without duplicates", () => {
  assert.deepEqual(deriveRolePermissions(["workspace:write", "VIEW_ASSIGNED_CASES", "workspace:read"]), [
    "workspace:write",
    "VIEW_ASSIGNED_CASES",
    "workspace:read",
  ]);
  assert.deepEqual(mergeWorkspaceReadPermission(["VIEW_ASSIGNED_CASES", "VIEW_ASSIGNED_CASES"]), [
    "VIEW_ASSIGNED_CASES",
    "workspace:read",
  ]);
});

test("arrears management is reserved to confidential ADMIN role, not delegated user managers", () => {
  assert.equal(canManageConfidentialFinance("ADMIN"), true);
  assert.equal(canManageConfidentialFinance("COLLABORATOR"), false);
  assert.equal(canManageConfidentialFinance("EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR"), false);
});

test("granting arrears visibility preserves existing rights without granting admin rights", () => {
  assert.deepEqual(mergeArrearsVisibilityPermissions(["workspace:read", "MANAGE_ASSIGNED_CASES", "VIEW_OWN_ARREARS"]), [
    "workspace:read",
    "MANAGE_ASSIGNED_CASES",
    "VIEW_OWN_ARREARS",
    "VIEW_OWN_FINANCIAL_INFORMATION",
  ]);
  assert.equal(canReceiveArrears("ADMIN"), false);
  assert.equal(canReceiveArrears("COLLABORATOR"), true);
});

test("non-admin user managers cannot assign ADMIN or either user-management permission", () => {
  assert.equal(canAssignCollaboratorAccess("COLLABORATOR", "COLLABORATOR", ["workspace:read"]), true);
  assert.equal(canAssignCollaboratorAccess("COLLABORATOR", "ADMIN", ["workspace:read"]), false);
  assert.equal(canAssignCollaboratorAccess("COLLABORATOR", "COLLABORATOR", ["MANAGE_USERS"]), false);
  assert.equal(canAssignCollaboratorAccess("COLLABORATOR", "COLLABORATOR", ["MANAGE_PERMISSIONS"]), false);
  assert.equal(canAssignCollaboratorAccess("ADMIN", "ADMIN", ["MANAGE_USERS", "MANAGE_PERMISSIONS"]), true);
});

test("role permission validation rejects unsupported grants and escalation through role edits", () => {
  const supportedPermissions = ["workspace:read", "workspace:write", "MANAGE_USERS", "MANAGE_PERMISSIONS"];
  assert.equal(hasSupportedRolePermissions(["workspace:read", "workspace:write"], supportedPermissions), true);
  assert.equal(hasSupportedRolePermissions(["unknown:grant"], supportedPermissions), false);
  assert.equal(addsUserManagementPermissions(["workspace:read"], ["workspace:read", "MANAGE_USERS"]), true);
  assert.equal(addsUserManagementPermissions(["MANAGE_USERS"], ["MANAGE_USERS"]), false);
  assert.equal(isReservedAdminRoleRename("COLLABORATOR", "ADMIN"), true);
  assert.equal(isReservedAdminRoleRename("ADMIN", "ADMIN"), false);
  assert.equal(isReservedAdminRoleRename("COLLABORATOR", "CUSTOM"), false);
});

test("self role changes are rejected only when they are actual demotions", () => {
  assert.equal(isSelfRoleDemotion(true, "COLLABORATOR", "COLLABORATOR"), false);
  assert.equal(isSelfRoleDemotion(false, "COLLABORATOR", "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR"), false);
  assert.equal(isSelfRoleDemotion(true, "COLLABORATOR", "EXECUTIVE_ASSISTANT_STRATEGIC_ADVISOR"), true);
  assert.equal(isSelfRoleDemotion(true, "ADMIN", "ADMIN"), false);
});