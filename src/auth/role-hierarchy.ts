import type { UserRole } from "./roles.js";

const roleRank: Readonly<Record<UserRole, number>> = {
  FIELD_OFFICER: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export const canCreateRole = (actorRole: UserRole, newRole: UserRole) => {
  if (actorRole === "SUPER_ADMIN") return true;
  return (
    actorRole === "ADMIN" &&
    (newRole === "MANAGER" || newRole === "FIELD_OFFICER")
  );
};

export const canManageRole = (actorRole: UserRole, targetRole: UserRole) => {
  if (actorRole === "SUPER_ADMIN") return true;
  return actorRole === "ADMIN" && roleRank[targetRole] < roleRank[actorRole];
};

export const canAssignRole = (actorRole: UserRole, newRole: UserRole) =>
  actorRole === "SUPER_ADMIN" && roleRank[newRole] <= roleRank.SUPER_ADMIN;
