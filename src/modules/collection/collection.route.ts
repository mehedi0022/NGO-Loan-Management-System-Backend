import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";

import {
  createCollection,
  createBatchCollections,
  getDueInstallments,
  getCollections,
  getCollectionById,
} from "./controllers/collection.controller.js";

import {
  createCollectionSchema,
  batchCollectionSchema,
  dueInstallmentsSchema,
  collectionsListSchema,
  collectionDetailsSchema,
} from "./validations/collections.validation.js";

const router = Router();

/**
 * All collection routes require authentication.
 */
router.use(requireAuth);

/**
 * GET /api/v1/collections/installments
 *
 * Get due installments for a selected date.
 *
 * Used by the daily Collection Sheet.
 *
 * Example:
 * /api/v1/collections/installments?dueDate=2026-11-01
 */
router.get(
  "/installments",
  validate(dueInstallmentsSchema),
  requirePermission(permissions.collectionsReadAny),
  getDueInstallments,
);

/**
 * POST /api/v1/collections
 *
 * Create a single collection.
 *
 * Supports:
 * - Loan only
 * - Loan + General Savings
 * - Loan + Special Savings
 * - Loan + both Savings
 * - General Savings only
 * - Special Savings only
 * - Both Savings
 *
 * This endpoint can therefore also be used
 * for Quick Savings Collection.
 */
router.post(
  "/",
  validate(createCollectionSchema),
  requirePermission(permissions.collectionsCreate),
  createCollection,
);

/**
 * POST /api/v1/collections/batch
 *
 * Batch collection from the daily Collection Sheet.
 *
 * Each item can contain:
 * - Loan collection
 * - General Savings
 * - Special Savings
 */
router.post(
  "/batch",
  validate(batchCollectionSchema),
  requirePermission(permissions.collectionsCreate),
  createBatchCollections,
);

/**
 * GET /api/v1/collections
 *
 * Collection history with optional:
 * - memberId
 * - fromDate
 * - toDate
 * - pagination
 */
router.get(
  "/",
  validate(collectionsListSchema),
  requirePermission(permissions.collectionsReadAny),
  getCollections,
);

/**
 * GET /api/v1/collections/:collectionId
 *
 * Get a complete collection receipt/details.
 *
 * IMPORTANT:
 * Keep this route after static routes
 * such as /installments and /batch.
 */
router.get(
  "/:collectionId",
  validate(collectionDetailsSchema),
  requirePermission(permissions.collectionsReadAny),
  getCollectionById,
);

export default router;
