import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

export const createLoanSchema = z.object({
  body: z
    .object({
      memberId: z.coerce.number().int().positive(),
      principalAmount: z.coerce.number().positive(),
      chargeType: z.enum(["FLAT", "PERCENTAGE"]),
      chargeValue: z.coerce.number().min(0),
      installmentCount: z.coerce.number().int().positive(),
      frequency: z.enum(["WEEKLY", "MONTHLY"]),
      purpose: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.chargeType === "PERCENTAGE" && data.chargeValue > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["chargeValue"],
          message: "Percentage charge cannot be greater than 100",
        });
      }
    })
    .strict(),
});

/**
 * Loan ID params
 */
const loanIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const loanIdSchema = z.object({
  params: loanIdParams,
});

export const updateLoanSchema = z.object({
  params: loanIdParams,
  body: z.object({
    memberId: z.coerce.number().int().positive().optional(), principalAmount: z.coerce.number().positive().optional(),
    chargeType: z.enum(["FLAT", "PERCENTAGE"]).optional(), chargeValue: z.coerce.number().min(0).optional(),
    installmentCount: z.coerce.number().int().positive().optional(), frequency: z.enum(["WEEKLY", "MONTHLY"]).optional(),
    purpose: z.string().trim().nullable().optional(), notes: z.string().trim().nullable().optional(),
  }).strict().superRefine((data, ctx) => {
    if (data.chargeType === "PERCENTAGE" && data.chargeValue !== undefined && data.chargeValue > 100) ctx.addIssue({ code: "custom", path: ["chargeValue"], message: "Percentage charge cannot be greater than 100" });
  }).refine((data) => Object.keys(data).length > 0, { message: "At least one loan field is required" }),
});

export const rejectLoanSchema = z.object({ params: loanIdParams, body: z.object({ rejectionReason: z.string().trim().min(1).max(1000) }).strict() });

export const disburseLoanSchema = z.object({
  params: loanIdParams,
  body: z.object({
    disbursementDate: z.coerce.date(),
    firstDueDate: z.coerce.date(),
  }).strict().refine((data) => data.firstDueDate > data.disbursementDate, {
    path: ["firstDueDate"],
    message: "First installment due date must be after disbursement date",
  }),
});

/**
 * Loan list query
 */
export const loanListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      search: z.string().trim().optional(),
      status: z
        .enum([
          "PENDING",
          "APPROVED",
          "ACTIVE",
          "COMPLETED",
          "REJECTED",
          "CANCELLED",
        ])
        .optional(),
      frequency: z.enum(["WEEKLY", "MONTHLY"]).optional(),
      memberId: z.coerce.number().int().positive().optional(),
      sortBy: z
        .enum([
          "id",
          "loanId",
          "principalAmount",
          "totalPayable",
          "applicationDate",
          "createdAt",
        ])
        .default("createdAt"),
    })
    .strict(),
});
