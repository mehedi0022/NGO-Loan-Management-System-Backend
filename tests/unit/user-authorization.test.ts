import { describe, expect, it } from "vitest";

import {
  getPermissionsForRole,
  permissions,
  roleHasPermission,
} from "../../src/auth/authorization.js";
import {
  canAssignRole,
  canCreateRole,
  canManageRole,
} from "../../src/auth/role-hierarchy.js";

describe("user management authorization", () => {
  it("gives SUPER_ADMIN every user-management permission", () => {
    expect(getPermissionsForRole("SUPER_ADMIN")).toEqual(
      expect.arrayContaining([
        permissions.usersReadAny,
        permissions.usersCreate,
        permissions.usersUpdateAny,
        permissions.usersChangeRole,
        permissions.usersChangeStatus,
        permissions.usersResetPassword,
      ]),
    );
  });

  it("allows ADMIN operational user management but not role changes or deletion", () => {
    expect(roleHasPermission("ADMIN", permissions.usersReadAny)).toBe(true);
    expect(roleHasPermission("ADMIN", permissions.usersCreate)).toBe(true);
    expect(roleHasPermission("ADMIN", permissions.usersUpdateAny)).toBe(true);
    expect(roleHasPermission("ADMIN", permissions.usersChangeStatus)).toBe(true);
    expect(roleHasPermission("ADMIN", permissions.usersResetPassword)).toBe(true);
    expect(roleHasPermission("ADMIN", permissions.usersChangeRole)).toBe(false);
  });

  it("does not grant user-management permissions to MANAGER", () => {
    expect(roleHasPermission("MANAGER", permissions.usersReadAny)).toBe(false);
    expect(roleHasPermission("MANAGER", permissions.usersCreate)).toBe(false);
    expect(roleHasPermission("MANAGER", permissions.usersUpdateAny)).toBe(false);
  });

  it("enforces the approved role hierarchy", () => {
    expect(canCreateRole("ADMIN", "MANAGER")).toBe(true);
    expect(canCreateRole("ADMIN", "ADMIN")).toBe(false);
    expect(canCreateRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(canManageRole("ADMIN", "MANAGER")).toBe(true);
    expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
    expect(canManageRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(canAssignRole("ADMIN", "MANAGER")).toBe(false);
    expect(canAssignRole("SUPER_ADMIN", "ADMIN")).toBe(true);
  });
});
