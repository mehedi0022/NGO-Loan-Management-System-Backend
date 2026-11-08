import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import type { ListDayClosingsQuery } from "../day-closing.types.js";
import * as service from "../services/day-closing.service.js";

export const getActiveBusinessDay = asyncHandler(
  async (_req: Request, res: Response) => {
    const activeDay = await service.getActiveBusinessDay();
    return res.status(200).json({
      success: true,
      message: "Active business day retrieved successfully",
      data: activeDay,
    });
  },
);

export const getDayClosingPreview = asyncHandler(
  async (_req: Request, res: Response) => {
    const preview = await service.getDayClosingPreview();
    return res.status(200).json({
      success: true,
      message: "Day closing preview retrieved successfully",
      data: preview,
    });
  },
);

export const executeDayClosing = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const result = await service.executeDayClosing(userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Business day closed successfully",
      data: result,
    });
  },
);

export const listDayClosings = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.listDayClosings(
      req.query as unknown as ListDayClosingsQuery,
    );
    return res.status(200).json({
      success: true,
      message: "Historical day closings retrieved successfully",
      data: result,
    });
  },
);
