const USER_MANAGEMENT_PERMISSIONS = new Set(["MANAGE_USERS", "MANAGE_PERMISSIONS"]);
const BOOTSTRAP_ADMIN_EMAIL = "admin@somiren.local";
const ARREARS_VISIBILITY_PERMISSIONS = ["VIEW_OWN_ARREARS", "VIEW_OWN_FINANCIAL_INFORMATION"] as const;

export type UserManager = {
  role: string;
  permissions: string[];
};

export function normalizeCollaboratorEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isUserManager(user: UserManager): boolean {
  return user.role === "ADMIN" || user.permissions.includes("MANAGE_USERS");
}

export function hasUserManagementPermissions(permissions: readonly string[]): boolean {
  return permissions.some(permission => USER_MANAGEMENT_PERMISSIONS.has(permission));
}

export function isProtectedCollaboratorAccount(role: string, email: string, permissions: readonly string[]): boolean {
  return role === "ADMIN" ||
    normalizeCollaboratorEmail(email) === BOOTSTRAP_ADMIN_EMAIL ||
    hasUserManagementPermissions(permissions);
}

export function deriveRolePermissions(rolePermissions: readonly string[]): string[] {
  return [...new Set([...rolePermissions, "workspace:read"])];
}

export function mergeWorkspaceReadPermission(currentPermissions: readonly string[]): string[] {
  return [...new Set([...currentPermissions, "workspace:read"])];
}

export function canManageConfidentialFinance(role: string): boolean {
  return role === "ADMIN";
}

export function canReceiveArrears(role: string): boolean {
  return role !== "ADMIN";
}

export function mergeArrearsVisibilityPermissions(currentPermissions: readonly string[]): string[] {
  return [...new Set([...currentPermissions, ...ARREARS_VISIBILITY_PERMISSIONS])];
}

export function hasSupportedRolePermissions(
  rolePermissions: readonly string[],
  supportedPermissions: readonly string[],
): boolean {
  const supported = new Set(supportedPermissions);
  return rolePermissions.every(permission => supported.has(permission));
}

export function canAssignCollaboratorAccess(
  actorRole: string,
  targetRole: string,
  assignedPermissions?: readonly string[],
): boolean {
  return actorRole === "ADMIN" || (
    targetRole !== "ADMIN" &&
    !assignedPermissions?.some(permission => USER_MANAGEMENT_PERMISSIONS.has(permission))
  );
}

export function addsUserManagementPermissions(
  previousPermissions: readonly string[],
  nextPermissions: readonly string[],
): boolean {
  const previous = new Set(previousPermissions);
  return nextPermissions.some(permission =>
    USER_MANAGEMENT_PERMISSIONS.has(permission) && !previous.has(permission)
  );
}

export function isReservedAdminRoleRename(previousLabel: string, nextLabel: string | undefined): boolean {
  return nextLabel === "ADMIN" && previousLabel !== "ADMIN";
}

export function isSelfRoleDemotion(
  isSelf: boolean,
  currentRole: string,
  nextRole: string | undefined,
): boolean {
  return isSelf && nextRole !== undefined && nextRole !== currentRole && nextRole !== "ADMIN";
}