import type { UserRole } from "./roles.js";

export const permissions = {
  usersReadAny: "users:read:any",
  usersUpdateAny: "users:update:any",
  usersDeleteAny: "users:delete:any",
} as const;

export type Permission = (typeof permissions)[keyof typeof permissions];

const rolePermissions: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  SUPER_ADMIN: new Set(Object.values(permissions)),
  ADMIN: new Set(Object.values(permissions)),
  USER: new Set(),
  CUSTOMER: new Set(),
  MODERATOR: new Set(),
  AUTHOR: new Set(),
  MANAGER: new Set(),
};

export const roleHasPermission = (role: UserRole, permission: Permission) =>
  rolePermissions[role].has(permission);
