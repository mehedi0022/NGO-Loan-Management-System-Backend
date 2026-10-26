import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination.js";

const paymentMethod = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_PAYMENT",
  "CHEQUE",
  "OTHER",
]);

export const createDpsAccountSchema = z.object({
  body: z
    .object({
      memberId: z.coerce.number().int().positive(),
      frequency: z.enum(["WEEKLY", "MONTHLY"]).default("MONTHLY"),
      installmentAmount: z.coerce.number().positive(),
      durationMonths: z.coerce.number().int().min(6).max(240),
      interestRate: z.coerce.number().min(0).max(100).default(8.5),
      startDate: z.coerce.date().default(() => new Date()),
      notes: z.string().trim().max(2000).optional(),
    })
    .strict(),
});

export const depositDpsSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }).strict(),
  body: z
    .object({
      amount: z.coerce.number().positive(),
      installmentNo: z.coerce.number().int().positive().optional(),
      transactionDate: z.coerce.date().default(() => new Date()),
      paymentMethod: paymentMethod.default("CASH"),
      reference: z.string().trim().max(255).optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .strict(),
});

export const closeDpsSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }).strict(),
  body: z
    .object({
      closeType: z.enum(["MATURITY_PAYOUT", "PREMATURE_CLOSE"]).optional(),
      payoutAmount: z.coerce.number().min(0).optional(),
      transactionDate: z.coerce.date().default(() => new Date()),
      paymentMethod: paymentMethod.default("CASH"),
      notes: z.string().trim().max(2000).optional(),
    })
    .strict(),
});

export const dpsListQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      memberId: z.coerce.number().int().positive().optional(),
      somitiId: z.coerce.number().int().positive().optional(),
      frequency: z.enum(["WEEKLY", "MONTHLY"]).optional(),
      status: z.enum(["ACTIVE", "MATURED", "CLOSED"]).optional(),
      search: z.string().trim().max(255).optional(),
      sortBy: z
        .enum(["createdAt", "startDate", "maturityDate", "installmentAmount", "id"])
        .default("createdAt"),
    })
    .strict(),
});

export const dpsIdParamsSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }).strict(),
});
