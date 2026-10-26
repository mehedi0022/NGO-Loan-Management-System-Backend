import { z } from "zod";
import { paginationQuerySchema } from "../../../utils/pagination.js";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const transactionTypes = ["INCOME", "EXPENSE"] as const;

export const paymentMethods = [
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_PAYMENT",
  "CHEQUE",
  "OTHER",
] as const;

// 1. Category Schemas
export const createCategorySchema = z.object({
  body: z
    .object({
      name: z
        .string("Category name is required")
        .trim()
        .min(2, "Category name must be at least 2 characters")
        .max(100, "Category name must be at most 100 characters"),
      type: z.enum(transactionTypes, {
        error: "Type must be either INCOME or EXPENSE",
      }),
      description: z.string().trim().max(255).optional().nullable(),
      isActive: z.boolean().default(true),
    })
    .strict(),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      type: z.enum(transactionTypes).optional(),
      description: z.string().trim().max(255).optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .strict(),
});

export const categoryQuerySchema = z.object({
  query: z
    .object({
      type: z.enum([...transactionTypes, "ALL"]).optional(),
      isActive: z
        .string()
        .optional()
        .transform((val) => (val === undefined ? undefined : val === "true")),
    })
    .strict(),
});

// 2. Income & Expense Voucher Schemas
export const createIncomeExpenseSchema = z.object({
  body: z
    .object({
      type: z.enum(transactionTypes, {
        error: "Type must be either INCOME or EXPENSE",
      }),
      categoryId: z.coerce
        .number({ error: "Category is required" })
        .int()
        .positive(),
      amount: z.coerce
        .number({ error: "Amount is required" })
        .positive("Amount must be greater than zero"),
      date: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional(),
      paymentMethod: z.enum(paymentMethods).default("CASH"),
      reference: z.string().trim().max(100).optional().nullable(),
      description: z.string().trim().max(500).optional().nullable(),
      somitiId: z.coerce.number().int().positive().optional().nullable(),
    })
    .strict(),
});

export const updateIncomeExpenseSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z
    .object({
      categoryId: z.coerce.number().int().positive().optional(),
      amount: z.coerce.number().positive().optional(),
      date: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional(),
      paymentMethod: z.enum(paymentMethods).optional(),
      reference: z.string().trim().max(100).optional().nullable(),
      description: z.string().trim().max(500).optional().nullable(),
      somitiId: z.coerce.number().int().positive().optional().nullable(),
    })
    .strict(),
});

export const incomeExpenseQuerySchema = z.object({
  query: paginationQuerySchema
    .extend({
      type: z.enum([...transactionTypes, "ALL"]).optional(),
      categoryId: z.coerce.number().int().positive().optional(),
      somitiId: z.coerce.number().int().positive().optional(),
      paymentMethod: z.enum([...paymentMethods, "ALL"]).optional(),
      startDate: z
        .string()
        .regex(dateRegex, "Start date must be in YYYY-MM-DD format")
        .optional(),
      endDate: z
        .string()
        .regex(dateRegex, "End date must be in YYYY-MM-DD format")
        .optional(),
      search: z.string().trim().optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate) <= new Date(data.endDate);
        }
        return true;
      },
      {
        message: "startDate cannot be later than endDate",
        path: ["startDate"],
      },
    ),
});
