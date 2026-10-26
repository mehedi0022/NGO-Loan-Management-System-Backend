import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const dailyCollectionReportSchema = z.object({
  query: paginationQuerySchema
    .extend({
      startDate: dateStringSchema.optional(),
      endDate: dateStringSchema.optional(),
      somitiId: z.coerce.number().int().positive().optional(),
      fieldOfficerId: z.coerce.number().int().positive().optional(),
      collectedById: z.coerce.number().int().positive().optional(),
      paymentMethod: z
        .enum(["CASH", "BANK_TRANSFER", "MOBILE_PAYMENT", "CHEQUE", "OTHER"])
        .optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      {
        message: "startDate cannot be later than endDate",
        path: ["startDate"],
      },
    ),
});

export const loanPortfolioReportSchema = z.object({
  query: paginationQuerySchema
    .extend({
      somitiId: z.coerce.number().int().positive().optional(),
      fieldOfficerId: z.coerce.number().int().positive().optional(),
      status: z
        .enum([
          "ALL",
          "PENDING",
          "APPROVED",
          "ACTIVE",
          "COMPLETED",
          "REJECTED",
          "WRITTEN_OFF",
        ])
        .optional(),
      startDate: dateStringSchema.optional(),
      endDate: dateStringSchema.optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.startDate <= data.endDate;
        }
        return true;
      },
      {
        message: "startDate cannot be later than endDate",
        path: ["startDate"],
      },
    ),
});

export const overdueReportSchema = z.object({
  query: paginationQuerySchema.extend({
    asOfDate: dateStringSchema.optional(),
    somitiId: z.coerce.number().int().positive().optional(),
    fieldOfficerId: z.coerce.number().int().positive().optional(),
    minDaysOverdue: z.coerce.number().int().nonnegative().optional(),
  }),
});

export const savingsSummaryReportSchema = z.object({
  query: paginationQuerySchema.extend({
    somitiId: z.coerce.number().int().positive().optional(),
    fieldOfficerId: z.coerce.number().int().positive().optional(),
    status: z.enum(["ALL", "ACTIVE", "INACTIVE", "DORMANT", "CLOSED"]).optional(),
  }),
});
