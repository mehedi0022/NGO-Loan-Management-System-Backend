import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/contract.d.js";

export type UserRole = FieldOutputTypes["public"]["User"]["role"];

export const userRoleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
] satisfies readonly UserRole[]);
