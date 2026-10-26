import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as service from "../services/settings.service.js";
import type { OrganizationSettingsDTO } from "../settings.types.js";

export const getSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const settings = await service.getSettings();
    return res.status(200).json({
      success: true,
      message: "Organization settings fetched successfully",
      data: settings,
    });
  },
);

export const updateSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const settings = await service.updateSettings(
      req.body as OrganizationSettingsDTO,
    );
    return res.status(200).json({
      success: true,
      message: "Organization settings updated successfully",
      data: settings,
    });
  },
);
