import { z } from "zod";

export const createAccountSchema = z.object({
  body: z.object({
    accountName: z.string().trim().min(2, "Account name must be at least 2 characters"),
    accountType: z.enum(["CASH", "BANK", "MOBILE_BANKING"]).default("CASH"),
    accountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    branchName: z.string().trim().optional(),
    initialBalance: z.number().min(0, "Initial balance cannot be negative").default(0),
    isDefault: z.boolean().optional().default(false),
    notes: z.string().trim().optional(),
  }),
});

export const updateAccountSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive(),
  }),
  body: z.object({
    accountName: z.string().trim().min(2).optional(),
    accountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    branchName: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    notes: z.string().trim().optional(),
  }),
});

export const transferFundsSchema = z.object({
  body: z.object({
    fromAccountId: z.coerce.number().positive("Source account is required"),
    toAccountId: z.coerce.number().positive("Destination account is required"),
    amount: z.coerce.number().positive("Transfer amount must be greater than 0"),
    transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
    notes: z.string().trim().optional(),
  }).refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts must be different",
    path: ["toAccountId"],
  }),
});

export const injectCapitalSchema = z.object({
  body: z.object({
    accountId: z.coerce.number().positive("Account is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    source: z.string().trim().optional(),
    depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
    notes: z.string().trim().optional(),
  }),
});

export const listTransactionsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    accountId: z.coerce.number().int().positive().optional(),
    type: z.enum(["DEBIT", "CREDIT"]).optional(),
    sourceModule: z.enum([
      "CAPITAL_INJECTION",
      "MEMBER_ADMISSION",
      "LOAN_DISBURSEMENT",
      "LOAN_COLLECTION",
      "SAVINGS_DEPOSIT",
      "SAVINGS_WITHDRAWAL",
      "DPS_DEPOSIT",
      "DPS_WITHDRAWAL",
      "OFFICE_EXPENSE",
      "OTHER_INCOME",
      "FUND_TRANSFER",
    ]).optional(),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
  }),
});

export const dailyCashSheetQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
    accountId: z.coerce.number().int().positive().optional(),
  }),
});

export const profitLossQuerySchema = z.object({
  query: z.object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
  }),
});

export const accountIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive(),
  }),
});
