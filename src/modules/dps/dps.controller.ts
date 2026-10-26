import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as dpsService from "./dps.service.js";
import type {
  CreateDpsAccountInput,
  DepositDpsInput,
  CloseDpsInput,
  DpsListQuery,
} from "./dps.types.js";

export const createDpsAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await dpsService.createDpsAccount(
      req.body as CreateDpsAccountInput,
      req.auth!.userId,
    );
    res.status(201).json(successResponse("DPS account opened successfully", result));
  },
);

export const getDpsAccounts = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await dpsService.getDpsAccounts(req.query as unknown as DpsListQuery);
    res.status(200).json(successResponse("DPS accounts fetched successfully", result));
  },
);

export const getDpsAccountById = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await dpsService.getDpsAccountById(Number(req.params.id));
    res.status(200).json(successResponse("DPS account details fetched successfully", result));
  },
);

export const depositDpsInstallment = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await dpsService.depositDpsInstallment(
      Number(req.params.id),
      req.body as DepositDpsInput,
      req.auth!.userId,
    );
    res.status(200).json(successResponse("DPS installment deposited successfully", result));
  },
);

export const closeDpsAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await dpsService.closeDpsAccount(
      Number(req.params.id),
      req.body as CloseDpsInput,
      req.auth!.userId,
    );
    res.status(200).json(successResponse("DPS account closed successfully", result));
  },
);

export const calculateDpsMaturity = asyncHandler(
  async (req: Request, res: Response) => {
    const monthlyAmount = Number(req.query.monthlyAmount || 1000);
    const durationMonths = Number(req.query.durationMonths || 60);
    const interestRate = Number(req.query.interestRate || 8.5);
    const result = dpsService.calculateDpsMaturity(monthlyAmount, durationMonths, interestRate);
    res.status(200).json(successResponse("DPS maturity calculated successfully", result));
  },
);
