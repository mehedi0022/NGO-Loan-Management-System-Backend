import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.middleware.js";
import * as service from "../services/somiti.service.js";
import type {
  CreateSomitiInput,
  SomitiListQuery,
  UpdateSomitiInput,
} from "../somiti.types.js";

export const createSomiti = asyncHandler(
  async (req: Request, res: Response) => {
    const somiti = await service.createSomiti(req.body as CreateSomitiInput);
    return res
      .status(201)
      .json(successResponse("Somiti created successfully", somiti));
  },
);

export const getSomities = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { somities, meta } = await service.getSomities(
    req.query as unknown as SomitiListQuery,
    auth,
  );
  return res
    .status(200)
    .json(paginatedResponse("Somities fetched successfully", somities, meta));
});

export const getActiveSomitiesList = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const list = await service.getActiveSomitiesList(auth);
    return res
      .status(200)
      .json(successResponse("Active somities fetched successfully", list));
  },
);

export const getSomitiById = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const id = Number(req.params.id);
    const somiti = await service.getSomitiById(id, auth);
    return res
      .status(200)
      .json(successResponse("Somiti details fetched successfully", somiti));
  },
);

export const updateSomiti = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const somiti = await service.updateSomiti(
      id,
      req.body as UpdateSomitiInput,
    );
    return res
      .status(200)
      .json(successResponse("Somiti updated successfully", somiti));
  },
);

export const deleteSomiti = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await service.deleteSomiti(id);
    return res
      .status(200)
      .json(successResponse("Somiti deleted successfully", null));
  },
);

export const getSomitiMembers = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const { members, meta } = await service.getSomitiMembers(id, page, limit);
    return res
      .status(200)
      .json(
        paginatedResponse(
          "Somiti members fetched successfully",
          members,
          meta,
        ),
      );
  },
);
