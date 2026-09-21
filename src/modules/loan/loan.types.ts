import { z } from "zod";

import {
  createLoanSchema,
  loanListQuerySchema,
  updateLoanSchema,
  disburseLoanSchema,
} from "./validations/loan.validation.js";

export type CreateLoanInput = z.infer<typeof createLoanSchema>["body"];
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>["body"];
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>["body"];

export type LoanListQuery = z.infer<typeof loanListQuerySchema>["query"];
