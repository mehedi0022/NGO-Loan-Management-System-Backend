import type { Request, Response } from "express";

import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";

import * as service from "../services/collection.service.js";

import type {
  CreateCollectionInput,
  BatchCollectionInput,
} from "../collection.types.js";

/**
 * POST /api/v1/collections
 *
 * Create a single collection.
 *
 * Supports:
 * - Loan installment only
 * - Loan + savings
 * - General savings only
 * - Special savings only
 * - Both savings
 */
export const createCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.createCollection(
      req.body as CreateCollectionInput,
      req.auth!.userId,
    );

    return res
      .status(201)
      .json(successResponse("Collection created successfully", result));
  },
);

/**
 * POST /api/v1/collections/batch
 *
 * Create multiple collections from the
 * daily collection sheet.
 */
export const createBatchCollections = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.createBatchCollections(
      req.body as BatchCollectionInput,
      req.auth!.userId,
    );

    return res
      .status(201)
      .json(successResponse("Batch collections created successfully", result));
  },
);

/**
 * GET /api/v1/collections/installments?dueDate=...
 *
 * Get installments due on the selected date.
 * Used for the daily collection sheet.
 */
export const getDueInstallments = asyncHandler(
  async (req: Request, res: Response) => {
    const dueDate = new Date(String(req.query.dueDate));

    const result = await service.getDueInstallments(dueDate);

    return res
      .status(200)
      .json(successResponse("Due installments fetched successfully", result));
  },
);

/**
 * GET /api/v1/collections
 *
 * Get collection history.
 *
 * Supports:
 * - memberId
 * - fromDate
 * - toDate
 * - page
 * - limit
 */
export const getCollections = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.getCollections({
      memberId: req.query.memberId ? Number(req.query.memberId) : undefined,

      fromDate: req.query.fromDate
        ? new Date(String(req.query.fromDate))
        : undefined,

      toDate: req.query.toDate ? new Date(String(req.query.toDate)) : undefined,

      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
    });

    return res
      .status(200)
      .json(successResponse("Collections fetched successfully", result));
  },
);

/**
 * GET /api/v1/collections/:collectionId
 *
 * Get a single collection receipt/details.
 */
export const getCollectionById = asyncHandler(
  async (req: Request, res: Response) => {
    const collectionId = Number(req.params.collectionId);

    const result = await service.getCollectionById(collectionId);

    return res
      .status(200)
      .json(successResponse("Collection fetched successfully", result));
  },
);
