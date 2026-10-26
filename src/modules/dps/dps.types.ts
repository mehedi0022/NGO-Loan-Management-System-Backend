import { z } from "zod";
import type {
  createDpsAccountSchema,
  depositDpsSchema,
  closeDpsSchema,
  dpsListQuerySchema,
} from "./dps.validation.js";

export type CreateDpsAccountInput = z.infer<typeof createDpsAccountSchema>["body"];
export type DepositDpsInput = z.infer<typeof depositDpsSchema>["body"];
export type CloseDpsInput = z.infer<typeof closeDpsSchema>["body"];
export type DpsListQuery = z.infer<typeof dpsListQuerySchema>["query"];
