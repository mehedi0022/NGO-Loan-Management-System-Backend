import type { Request, Response } from "express";

import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.middleware.js";

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
    const somitiId = req.query.somitiId ? Number(req.query.somitiId) : undefined;
    const auth = (req as AuthenticatedRequest).auth;

    const result = await service.getDueInstallments(dueDate, somitiId, auth);

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
    const auth = (req as AuthenticatedRequest).auth;
    const result = await service.getCollections(
      {
        memberId: req.query.memberId ? Number(req.query.memberId) : undefined,
        somitiId: req.query.somitiId ? Number(req.query.somitiId) : undefined,

        fromDate: req.query.fromDate
          ? new Date(String(req.query.fromDate))
          : undefined,

        toDate: req.query.toDate ? new Date(String(req.query.toDate)) : undefined,

        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 20),
      },
      auth,
    );

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

/**
 * POST /api/v1/collections/:collectionId/reverse
 *
 * Reverse/Cancel an entire collection.
 */
export const reverseCollection = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const collectionId = Number(req.params.collectionId);
    const reason = String(req.body.reason || "Cancelled by admin").trim();

    const result = await service.reverseCollection(
      collectionId,
      reason,
      auth.userId,
    );

    return res
      .status(200)
      .json(successResponse("Collection reversed successfully", result));
  },
);

/**
 * POST /api/v1/collections/payments/:paymentId/reverse
 *
 * Reverse/Cancel an individual loan payment.
 */
export const reverseLoanPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const paymentId = Number(req.params.paymentId);
    const reason = String(req.body.reason || "Cancelled by admin").trim();

    const result = await service.reverseLoanPayment(
      paymentId,
      reason,
      auth.userId,
    );

    return res
      .status(200)
      .json(successResponse("Loan payment reversed successfully", result));
  },
);
