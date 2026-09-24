import { z } from "zod";
import { userRoleSchema } from "../../../auth/roles.js";
import { paginationQuerySchema } from "../../../utils/pagination.js";

export const createUserSchema = z.object({
  body: z.object({
    userName: z
      .string("Full name is required")
      .min(3, "Full name must be at least 3 characters"),

    fullName: z
      .string("Full name is required")
      .min(4, "Full name must be at least 4 characters"),

    email: z
      .string("Email is required")
      .trim()
      .toLowerCase()
      .pipe(z.email("Invalid email address")),

    password: z
      .string("Password is required")
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    role: userRoleSchema.optional(),
  }),
});

const userIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const userIdSchema = z.object({ params: userIdParams });

export const updateUserSchema = z.object({
  params: userIdParams,
  body: z
    .object({
      userName: z.string().min(2).nullable().optional(),
      fullName: z.string().min(3).nullable().optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one profile field is required",
    }),
});

export const changeUserRoleSchema = z.object({
  params: userIdParams,
  body: z.object({ role: userRoleSchema }).strict(),
});

export const changeUserStatusSchema = z.object({
  params: userIdParams,
  body: z.object({ isActive: z.boolean() }).strict(),
});

export const resetUserPasswordSchema = z.object({
  params: userIdParams,
  body: z
    .object({
      newPassword: z
        .string("New password is required")
        .min(8, "New password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    })
    .strict(),
});

export const userListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      role: userRoleSchema.optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      search: z.string().trim().min(1).max(100).optional(),
      sortBy: z
        .enum([
          "id",
          "email",
          "userName",
          "fullName",
          "role",
          "createdAt",
        ])
        .default("createdAt"),
    })
    .strict(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>["query"];
