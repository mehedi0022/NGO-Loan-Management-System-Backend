import { Temporal } from "temporal-polyfill";
import { z } from "zod";

const operationalDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD format")
  .refine(
    (value) => {
      try {
        Temporal.PlainDate.from(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "date must be a valid calendar date" },
  );

export const dashboardSummaryQuerySchema = z.object({
  query: z
    .object({
      date: operationalDateSchema.optional(),
      trendDays: z.coerce
        .number()
        .pipe(z.union([z.literal(7), z.literal(30)]))
        .default(7),
    })
    .strict(),
});
