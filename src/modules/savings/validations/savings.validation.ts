import { z } from "zod";

const paymentMethod = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_PAYMENT",
  "CHEQUE",
  "OTHER",
]);

export const memberSavingsSchema = z.object({
  params: z.object({ memberId: z.coerce.number().int().positive() }).strict(),
});

export const withdrawSavingsSchema = z.object({
  body: z
    .object({
      memberId: z.coerce.number().int().positive(),
      savingsType: z.enum(["GENERAL", "SPECIAL"]),
      amount: z.coerce.number().positive(),
      transactionDate: z.coerce.date(),
      paymentMethod,
      reference: z.string().trim().max(255).optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .strict(),
});

export const reverseSavingsTransactionSchema = z.object({
  params: z
    .object({
      transactionId: z.coerce.number().int().positive(),
    })
    .strict(),
  body: z
    .object({
      reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
    })
    .strict(),
});

export const previewInterestSchema = z.object({
  query: z
    .object({
      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().min(1, "End date is required"),
      generalSavingsRate: z.coerce.number().min(0).max(100).optional(),
      specialSavingsRate: z.coerce.number().min(0).max(100).optional(),
      somitiId: z.coerce.number().int().positive().optional(),
      compoundingInterval: z
        .enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"])
        .optional(),
    }),
});

export const postInterestSchema = z.object({
  body: z
    .object({
      startDate: z.string().min(1, "Start date is required"),
      endDate: z.string().min(1, "End date is required"),
      generalSavingsRate: z.coerce.number().min(0).max(100).optional(),
      specialSavingsRate: z.coerce.number().min(0).max(100).optional(),
      somitiId: z.coerce.number().int().positive().optional(),
      compoundingInterval: z
        .enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"])
        .optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .strict(),
});

export const updateSavingsInterestSettingsSchema = z.object({
  body: z
    .object({
      generalSavingsInterestRate: z.coerce.number().min(0).max(100),
      specialSavingsInterestRate: z.coerce.number().min(0).max(100),
      savingsCompoundingInterval: z.enum([
        "MONTHLY",
        "QUARTERLY",
        "HALF_YEARLY",
        "YEARLY",
      ]),
    })
    .strict(),
});
