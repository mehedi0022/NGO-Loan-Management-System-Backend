import type { Request, Response } from "express";

import { successResponse } from "../../../utils/api-response.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as service from "../services/savings.service.js";
import type { WithdrawSavingsInput } from "../savings.types.js";

export const getMemberSavings = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.getMemberSavings(Number(req.params.memberId));
    res.status(200).json(successResponse("Savings account fetched successfully", result));
  },
);

export const withdrawSavings = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.withdrawSavings(
      req.body as WithdrawSavingsInput,
      req.auth!.userId,
    );
    res.status(201).json(successResponse("Savings withdrawn successfully", result));
  },
);
