import type { FieldOutputTypes } from "../../prisma/contract.d.js";

type UserRecord = FieldOutputTypes["public"]["User"];

export type PublicUserDto = Pick<
  UserRecord,
  "id" | "email" | "userName" | "fullName" | "role" | "emailVerifiedAt" | "createdAt" | "updatedAt"
>;

export const toPublicUserDto = (user: PublicUserDto): PublicUserDto => ({
  id: user.id,
  email: user.email,
  userName: user.userName,
  fullName: user.fullName,
  role: user.role,
  emailVerifiedAt: user.emailVerifiedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
