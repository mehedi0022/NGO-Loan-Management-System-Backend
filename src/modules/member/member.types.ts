import { z } from "zod";

import {
  createMemberSchema,
  updateMemberSchema,
  memberListQuerySchema,
  memberFinancialHistorySchema,
} from "./validations/member.validation.js";

export type CreateMemberInput = z.infer<typeof createMemberSchema>["body"];

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>["body"];

export type MemberListQuery = z.infer<typeof memberListQuerySchema>["query"];

export type MemberFinancialHistoryQuery = z.infer<
  typeof memberFinancialHistorySchema
>["query"];
