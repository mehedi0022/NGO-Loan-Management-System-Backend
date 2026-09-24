import type { FieldOutputTypes } from "../../prisma/contract.d.js";
import {
  getPermissionsForRole,
  type Permission,
} from "../../auth/authorization.js";

type UserRecord = FieldOutputTypes["public"]["User"];

export type PublicUserDto = Pick<
  UserRecord,
  | "id"
  | "email"
  | "userName"
  | "fullName"
  | "role"
  | "isActive"
  | "emailVerifiedAt"
  | "createdAt"
  | "updatedAt"
>;

export const toPublicUserDto = (user: PublicUserDto): PublicUserDto => ({
  id: user.id,
  email: user.email,
  userName: user.userName,
  fullName: user.fullName,
  role: user.role,
  isActive: user.isActive,
  emailVerifiedAt: user.emailVerifiedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export type AuthenticatedUserDto = PublicUserDto & {
  permissions: Permission[];
};

export const toAuthenticatedUserDto = (
  user: PublicUserDto,
): AuthenticatedUserDto => ({
  ...toPublicUserDto(user),
  permissions: getPermissionsForRole(user.role),
});
