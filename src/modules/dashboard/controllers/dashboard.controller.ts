import type { Request, Response } from "express";

import { asyncHandler } from "../../../utils/asyncHandler.js";
import { successResponse } from "../../../utils/api-response.js";
import type { DashboardSummaryQuery } from "../dashboard.types.js";
import * as service from "../services/dashboard.service.js";

export const getDashboardSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const summary = await service.getDashboardSummary(
      req.query as unknown as DashboardSummaryQuery,
    );

    res
      .status(200)
      .json(successResponse("Dashboard summary fetched successfully", summary));
  },
);
