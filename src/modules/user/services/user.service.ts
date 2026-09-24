import * as userRepository from "../repositories/user.repository.js";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../../errors/AppError.js";
import type { UserListQuery } from "../validations/user.validation.js";
import type { UserRole } from "../../../auth/roles.js";
import { hashPassword } from "../../../utils/password.util.js";
import { canCreateRole } from "../../../auth/role-hierarchy.js";
import {
  canAssignRole,
  canManageRole,
} from "../../../auth/role-hierarchy.js";
import * as accountTokenRepository from "../../auth/repositories/account-token.repository.js";
import { Temporal } from "temporal-polyfill";
import { toAuthenticatedUserDto } from "../user.dto.js";

export const getAllUsers = async (query: UserListQuery) => {
  return userRepository.findAllUsers(query);
};

export const getUserById = async (id: number) => {
  const user = await userRepository.findUserById(id);
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const createUser = async (actorRole: UserRole, data: {
  userName: string;
  fullName: string;
  email: string;
  password: string;
  role?: UserRole;
}) => {
  const email = data.email.trim().toLowerCase();
  const role = data.role ?? "MANAGER";

  if (!canCreateRole(actorRole, role)) {
    throw new AuthorizationError("You cannot create a user with this role");
  }

  if (await userRepository.findUserIdByEmail(email)) {
    throw new ConflictError("A user with this email already exists");
  }

  return userRepository.createUser({
    ...data,
    email,
    password: await hashPassword(data.password),
    role,
  });
};

export const getCurrentUser = async (id: number) => {
  const user = await getUserById(id);
  return toAuthenticatedUserDto(user);
};

export const updateUser = async (
  actor: { userId: number; role: UserRole },
  id: number,
  data: { userName?: string | null; fullName?: string | null },
) => {
  const target = await userRepository.findUserById(id);
  if (!target) throw new NotFoundError("User not found");

  if (actor.userId !== id && !canManageRole(actor.role, target.role)) {
    throw new AuthorizationError("You cannot update this user");
  }

  const user = await userRepository.updateUserById(id, data);
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const changeUserRole = async (
  actor: { userId: number; role: UserRole },
  id: number,
  newRole: UserRole,
) => {
  const target = await userRepository.findUserById(id);
  if (!target) throw new NotFoundError("User not found");

  if (!canManageRole(actor.role, target.role) || !canAssignRole(actor.role, newRole)) {
    throw new AuthorizationError("You cannot change this user's role");
  }

  if (actor.userId === id && target.role !== newRole) {
    throw new ConflictError("You cannot change your own role");
  }

  if (target.role === newRole) return target;

  if (
    target.role === "SUPER_ADMIN" &&
    target.isActive &&
    (await userRepository.countActiveSuperAdmins()) <= 1
  ) {
    throw new ConflictError("The last active SUPER_ADMIN cannot be demoted");
  }

  const user = await userRepository.updateUserRoleById(id, newRole);
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const changeUserStatus = async (
  actor: { userId: number; role: UserRole },
  id: number,
  isActive: boolean,
) => {
  const target = await userRepository.findUserById(id);
  if (!target) throw new NotFoundError("User not found");

  if (actor.userId === id && !isActive) {
    throw new ConflictError("You cannot deactivate your own account");
  }

  if (!canManageRole(actor.role, target.role)) {
    throw new AuthorizationError("You cannot change this user's status");
  }

  if (target.isActive === isActive) return target;

  if (
    target.role === "SUPER_ADMIN" &&
    target.isActive &&
    !isActive &&
    (await userRepository.countActiveSuperAdmins()) <= 1
  ) {
    throw new ConflictError("The last active SUPER_ADMIN cannot be deactivated");
  }

  const user = await userRepository.updateUserStatusAndRevokeSessions(
    id,
    isActive,
  );
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const resetUserPassword = async (
  actor: { userId: number; role: UserRole },
  id: number,
  newPassword: string,
) => {
  const target = await userRepository.findUserById(id);
  if (!target) throw new NotFoundError("User not found");

  if (actor.userId === id) {
    throw new ConflictError(
      "Use the change-password endpoint to update your own password",
    );
  }

  if (!canManageRole(actor.role, target.role)) {
    throw new AuthorizationError("You cannot reset this user's password");
  }

  const updated = await accountTokenRepository.changePasswordAndRevokeSessions({
    userId: id,
    passwordHash: await hashPassword(newPassword),
    now: Temporal.Now.instant(),
  });

  if (!updated) throw new NotFoundError("User not found");
};

