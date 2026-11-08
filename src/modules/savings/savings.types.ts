import { z } from "zod";

import {
  withdrawSavingsSchema,
  previewInterestSchema,
  postInterestSchema,
  updateSavingsInterestSettingsSchema,
} from "./validations/savings.validation.js";

export type WithdrawSavingsInput = z.infer<typeof withdrawSavingsSchema>["body"];
export type PreviewInterestQuery = z.infer<typeof previewInterestSchema>["query"];
export type PostInterestInput = z.infer<typeof postInterestSchema>["body"];
export type UpdateSavingsInterestSettingsInput = z.infer<typeof updateSavingsInterestSettingsSchema>["body"];
