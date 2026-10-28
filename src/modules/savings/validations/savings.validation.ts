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
