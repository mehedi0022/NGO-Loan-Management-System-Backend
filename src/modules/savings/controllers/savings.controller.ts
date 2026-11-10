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

export const reverseSavingsTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const transactionId = Number(req.params.transactionId);
    const reason = String(req.body.reason || "Cancelled by admin").trim();
    const result = await service.reverseSavingsTransaction(
      transactionId,
      reason,
      req.auth!.userId,
    );
    res
      .status(200)
      .json(successResponse("Savings transaction reversed successfully", result));
  },
);

export const getSavingsInterestSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await service.getSavingsInterestSettings();
    res
      .status(200)
      .json(successResponse("Savings interest settings fetched successfully", result));
  },
);

export const updateSavingsInterestSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.updateSavingsInterestSettings(req.body);
    res
      .status(200)
      .json(successResponse("Savings interest settings updated successfully", result));
  },
);

export const previewSavingsInterest = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      startDate,
      endDate,
      generalSavingsRate,
      specialSavingsRate,
      somitiId,
      compoundingInterval,
    } = req.query;

    const result = await service.previewSavingsInterest({
      startDate: String(startDate),
      endDate: String(endDate),
      generalSavingsRate: generalSavingsRate ? Number(generalSavingsRate) : undefined,
      specialSavingsRate: specialSavingsRate ? Number(specialSavingsRate) : undefined,
      somitiId: somitiId ? Number(somitiId) : undefined,
      compoundingInterval: compoundingInterval ? String(compoundingInterval) : undefined,
    });

    res
      .status(200)
      .json(successResponse("Savings interest calculation previewed successfully", result));
  },
);

export const postSavingsInterest = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.postSavingsInterest(req.body, req.auth!.userId);
    res
      .status(201)
      .json(successResponse("Savings interest posted and credited successfully", result));
  },
);

export const getInterestPostingHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.getInterestPostingHistory(page, limit);
    res
      .status(200)
      .json(successResponse("Savings interest postings fetched successfully", result));
  },
);

export const getSavingsWithdrawals = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await service.listSavingsWithdrawals({
      date: req.query.date ? String(req.query.date) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      somitiId: req.query.somitiId ? Number(req.query.somitiId) : undefined,
      savingsType: req.query.savingsType as "GENERAL" | "SPECIAL" | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res
      .status(200)
      .json(successResponse("Savings withdrawals fetched successfully", result));
  },
);
