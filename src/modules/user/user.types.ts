import { z } from "zod";
import {
  changeUserRoleSchema,
  changeUserStatusSchema,
  createUserSchema,
  resetUserPasswordSchema,
} from "./validations/user.validation";

export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type ChangeUserRoleInput = z.infer<
  typeof changeUserRoleSchema
>["body"];
export type ChangeUserStatusInput = z.infer<
  typeof changeUserStatusSchema
>["body"];
export type ResetUserPasswordInput = z.infer<
  typeof resetUserPasswordSchema
>["body"];
