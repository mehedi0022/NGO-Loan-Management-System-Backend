import { z } from "zod";
import { userRoleSchema } from "../../../auth/roles.js";
import { paginationQuerySchema } from "../../../utils/pagination.js";

export const createUserSchema = z.object({
  body: z.object({
    userName: z.string().min(2),
    fullName: z.string().min(3),
    email: z.email(),
    password: z.string().min(8),
  }),
});

const userIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const userIdSchema = z.object({ params: userIdParams });

export const updateUserSchema = z.object({
  params: userIdParams,
  body: z.object({
    userName: z.string().min(2).nullable().optional(),
    fullName: z.string().min(3).nullable().optional(),
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: "At least one profile field is required",
  }),
});

export const userListQuerySchema = z.object({
  query: paginationQuerySchema.extend({
    role: userRoleSchema.optional(),
    sortBy: z.enum(["id", "email", "userName", "createdAt"]).default("createdAt"),
  }).strict(),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>["query"];
