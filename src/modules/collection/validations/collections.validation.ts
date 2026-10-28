import { z } from "zod";

const paymentMethod = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "MOBILE_PAYMENT",
  "CHEQUE",
  "OTHER",
]);

const dpsCollectionItemSchema = z.object({
  dpsAccountId: z.coerce.number().int().positive(),
  amount: z.coerce.number().min(0),
});

/**
 * Shared collection item shape.
 *
 * A collection can contain:
 * - Loan installment only
 * - Loan + General Savings
 * - Loan + Special Savings
 * - Loan + both Savings
 * - General Savings only
 * - Special Savings only
 * - Both Savings
 * - Multiple DPS installments
 */
const collectionItemShape = {
  memberId: z.coerce.number().int().positive(),

  // Optional because savings/dps can be collected without a loan.
  loanId: z.preprocess(
    (val) => (val === null || val === "" || val === 0 ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
  installmentId: z.preprocess(
    (val) =>
      val === null ||
      val === "" ||
      val === 0 ||
      (typeof val === "string" && !/^\d+$/.test(val))
        ? undefined
        : val,
    z.coerce.number().int().positive().optional(),
  ),
  dpsAccountId: z.preprocess(
    (val) => (val === null || val === "" || val === 0 ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),

  loanCollectionAmount: z.coerce.number().min(0).default(0),
  generalSavingsAmount: z.coerce.number().min(0).default(0),
  specialSavingsAmount: z.coerce.number().min(0).default(0),
  dpsAmount: z.coerce.number().min(0).default(0),
  dpsCollections: z.array(dpsCollectionItemSchema).optional(),
};

type CollectionItem = {
  memberId: number;
  loanId?: number;
  installmentId?: number;
  dpsAccountId?: number;
  loanCollectionAmount: number;
  generalSavingsAmount: number;
  specialSavingsAmount: number;
  dpsAmount?: number;
  dpsCollections?: Array<{ dpsAccountId: number; amount: number }>;
};

/**
 * Shared business validation for both
 * single collection and batch collection.
 */
const validateCollectionItem = (data: CollectionItem, ctx: z.RefinementCtx) => {
  const {
    loanId,
    installmentId,
    loanCollectionAmount,
    generalSavingsAmount,
    specialSavingsAmount,
  } = data;
  const dpsCollectionsSum = Array.isArray(data.dpsCollections)
    ? data.dpsCollections.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
      )
    : 0;
  const dpsAmount = (data.dpsAmount ?? 0) + dpsCollectionsSum;

  const totalAmount =
    loanCollectionAmount + generalSavingsAmount + specialSavingsAmount + dpsAmount;

  /**
   * At least one amount must be collected.
   */
  if (totalAmount <= 0) {
    ctx.addIssue({
      code: "custom",
      path: ["loanCollectionAmount"],
      message: "At least one collection amount must be greater than 0",
    });

    return;
  }

  /**
   * Loan collection requires both
   * loanId and installmentId.
   */
  if (loanCollectionAmount > 0) {
    if (!loanId) {
      ctx.addIssue({
        code: "custom",
        path: ["loanId"],
        message: "loanId is required when collecting a loan payment",
      });
    }

    if (!installmentId) {
      ctx.addIssue({
        code: "custom",
        path: ["installmentId"],
        message: "installmentId is required when collecting a loan payment",
      });
    }
  }

  /**
   * loanId and installmentId must always
   * be provided together.
   */
  if (loanId && !installmentId) {
    ctx.addIssue({
      code: "custom",
      path: ["installmentId"],
      message: "installmentId is required when loanId is provided",
    });
  }

  if (installmentId && !loanId) {
    ctx.addIssue({
      code: "custom",
      path: ["loanId"],
      message: "loanId is required when installmentId is provided",
    });
  }

  /**
   * Loan references should not be sent
   * for a savings-only collection.
   */
  if (loanCollectionAmount === 0 && (loanId || installmentId)) {
    ctx.addIssue({
      code: "custom",
      path: ["loanCollectionAmount"],
      message:
        "loanCollectionAmount must be greater than 0 when loan information is provided",
    });
  }
};

const batchCollectionItemSchema = z
  .object({
    ...collectionItemShape,
    paymentMethod: paymentMethod.optional(),
  })
  .strict()
  .superRefine(validateCollectionItem);

/**
 * POST /api/v1/collections
 *
 * Create a single member collection.
 */
export const createCollectionSchema = z.object({
  body: z
    .object({
      ...collectionItemShape,

      collectionDate: z.coerce.date(),
      allowAdvance: z.boolean().optional().default(false),

      paymentMethod,

      reference: z.string().trim().max(255).optional(),

      notes: z.string().trim().max(2000).optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      validateCollectionItem(data, ctx);
    }),
});

/**
 * POST /api/v1/collections/batch
 *
 * Used by the daily installment collection sheet.
 *
 * collectionDate is shared across all selected rows. paymentMethod acts as
 * the batch default and can be overridden by an individual item.
 */
export const batchCollectionSchema = z.object({
  body: z
    .object({
      collectionDate: z.coerce.date(),
      allowAdvance: z.boolean().optional().default(false),

      paymentMethod,

      reference: z.string().trim().max(255).optional(),

      notes: z.string().trim().max(2000).optional(),

      items: z.array(batchCollectionItemSchema).min(1).max(500),
    })
    .strict()
    .superRefine((data, ctx) => {
      const installmentIds = new Set<number>();

      data.items.forEach((item, index) => {
        if (!item.installmentId) {
          return;
        }

        /**
         * Prevent collecting the same installment
         * twice inside the same batch request.
         */
        if (installmentIds.has(item.installmentId)) {
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "installmentId"],
            message: "An installment can only appear once in a batch",
          });

          return;
        }

        installmentIds.add(item.installmentId);
      });
    }),
});

/**
 * GET /api/v1/collections/installments?dueDate=...
 *
 * Get installment collection sheet by due date.
 */
export const dueInstallmentsSchema = z.object({
  query: z
    .object({
      dueDate: z.coerce.date(),
      somitiId: z.coerce.number().int().positive().optional(),
    })
    .strict(),
});

/**
 * GET /api/v1/collections
 *
 * Collection history.
 */
export const collectionsListSchema = z.object({
  query: z
    .object({
      memberId: z.coerce.number().int().positive().optional(),

      somitiId: z.coerce.number().int().positive().optional(),

      fromDate: z.coerce.date().optional(),

      toDate: z.coerce.date().optional(),

      page: z.coerce.number().int().positive().default(1),

      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
        ctx.addIssue({
          code: "custom",
          path: ["toDate"],
          message: "toDate must be greater than or equal to fromDate",
        });
      }
    }),
});

/**
 * GET /api/v1/collections/:collectionId
 */
export const collectionDetailsSchema = z.object({
  params: z
    .object({
      collectionId: z.coerce.number().int().positive(),
    })
    .strict(),
});

/**
 * POST /api/v1/collections/:collectionId/reverse
 */
export const reverseCollectionSchema = z.object({
  params: z
    .object({
      collectionId: z.coerce.number().int().positive(),
    })
    .strict(),
  body: z
    .object({
      reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
    })
    .strict(),
});

/**
 * POST /api/v1/collections/payments/:paymentId/reverse
 */
export const reverseLoanPaymentSchema = z.object({
  params: z
    .object({
      paymentId: z.coerce.number().int().positive(),
    })
    .strict(),
  body: z
    .object({
      reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(500),
    })
    .strict(),
});
