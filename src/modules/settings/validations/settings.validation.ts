import { z } from "zod";

export const updateSettingsSchema = z.object({
  body: z
    .object({
      orgName: z.string().trim().min(2).max(150).optional(),
      orgShortName: z.string().trim().max(50).nullable().optional(),
      registrationNo: z.string().trim().max(100).nullable().optional(),
      establishedYear: z.string().trim().max(10).nullable().optional(),
      logoUrl: z.string().trim().max(500).nullable().optional(),
      email: z.string().trim().email().nullable().optional(),
      phone: z.string().trim().max(50).nullable().optional(),
      address: z.string().trim().max(255).nullable().optional(),
      website: z.string().trim().max(200).nullable().optional(),
      currencySymbol: z.string().trim().max(10).optional(),
      currencyCode: z.string().trim().max(10).optional(),
      defaultLoanChargeType: z.enum(["FLAT", "PERCENTAGE"]).optional(),
      defaultLoanChargeValue: z.coerce.number().min(0).optional(),
      defaultLoanFrequency: z.enum(["WEEKLY", "MONTHLY"]).optional(),
      defaultGraceDays: z.coerce.number().int().min(0).max(365).optional(),
      latePenaltyPercentage: z.coerce.number().min(0).max(100).optional(),
      minGeneralSavingsDeposit: z.coerce.number().min(0).optional(),
      minSpecialSavingsDeposit: z.coerce.number().min(0).optional(),
    })
    .strict(),
});
