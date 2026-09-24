import type { UserRole } from "./roles.js";

const roleRank: Readonly<Record<UserRole, number>> = {
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export const canCreateRole = (actorRole: UserRole, newRole: UserRole) => {
  if (actorRole === "SUPER_ADMIN") return true;
  return actorRole === "ADMIN" && newRole === "MANAGER";
};

export const canManageRole = (actorRole: UserRole, targetRole: UserRole) => {
  if (actorRole === "SUPER_ADMIN") return true;
  return actorRole === "ADMIN" && roleRank[targetRole] < roleRank[actorRole];
};

export const canAssignRole = (actorRole: UserRole, newRole: UserRole) =>
  actorRole === "SUPER_ADMIN" && roleRank[newRole] <= roleRank.SUPER_ADMIN;
