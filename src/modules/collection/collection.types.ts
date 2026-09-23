import { z } from "zod";

import {
  batchCollectionSchema,
  createCollectionSchema,
} from "./validations/collections.validation.js";

/**
 * Single collection input.
 *
 * Supports:
 * - Loan collection
 * - Savings collection
 * - Loan + Savings collection
 */
export type CreateCollectionInput = z.infer<
  typeof createCollectionSchema
>["body"];

/**
 * Batch collection input.
 *
 * Used by the daily Collection Sheet.
 */
export type BatchCollectionInput = z.infer<
  typeof batchCollectionSchema
>["body"];

/**
 * Individual item from a batch collection.
 *
 * Useful in service/repository functions.
 */
export type BatchCollectionItem = BatchCollectionInput["items"][number];
