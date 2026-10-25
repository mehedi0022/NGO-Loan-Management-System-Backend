import { z } from "zod";
import type { FieldOutputTypes } from "../../prisma/contract.d.js";
import type {
  createSomitiSchema,
  somitiListQuerySchema,
  updateSomitiSchema,
} from "./validations/somiti.validation.js";

export type SomitiRecord = FieldOutputTypes["public"]["Somiti"];
export type SomitiDay = SomitiRecord["meetingDay"];
export type SomitiStatus = SomitiRecord["status"];

export type CreateSomitiInput = z.infer<typeof createSomitiSchema>["body"];
export type UpdateSomitiInput = z.infer<typeof updateSomitiSchema>["body"];
export type SomitiListQuery = z.infer<typeof somitiListQuerySchema>["query"];
