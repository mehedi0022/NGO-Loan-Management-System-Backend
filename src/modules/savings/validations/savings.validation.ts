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
