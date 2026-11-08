import { z } from "zod";

export const executeDayClosingSchema = z.object({
  body: z.object({
    notes: z.string().trim().max(500).optional(),
    nextBusinessDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "nextBusinessDate must be YYYY-MM-DD format")
      .optional(),
    isNextDayHoliday: z.boolean().optional(),
  }),
});

export const listDayClosingsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    fromDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "fromDate must be YYYY-MM-DD")
      .optional(),
    toDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "toDate must be YYYY-MM-DD")
      .optional(),
    status: z.enum(["OPEN", "CLOSED"]).optional(),
  }),
});
