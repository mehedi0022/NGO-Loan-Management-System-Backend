import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import * as service from "../services/accounts.service.js";

export const getAccounts = asyncHandler(async (_req: Request, res: Response) => {
  const result = await service.listAccounts();
  return res.status(200).json({
    success: true,
    message: "Financial accounts retrieved successfully",
    data: result,
  });
});

export const getAccountById = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const account = await service.getAccountById(id);
  return res.status(200).json({
    success: true,
    message: "Account retrieved successfully",
    data: account,
  });
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).auth?.userId;
  const account = await service.createAccount(req.body, userId);
  return res.status(201).json({
    success: true,
    message: "Financial account created successfully",
    data: account,
  });
});

export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const account = await service.updateAccount(id, req.body);
  return res.status(200).json({
    success: true,
    message: "Account updated successfully",
    data: account,
  });
});

export const transferFunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).auth?.userId;
  const result = await service.transferFunds(req.body, userId);
  return res.status(200).json({
    success: true,
    message: "Funds transferred successfully",
    data: result,
  });
});

export const injectCapital = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).auth?.userId;
  const result = await service.injectCapital(req.body, userId);
  return res.status(200).json({
    success: true,
    message: "Capital deposited successfully",
    data: result,
  });
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listTransactions(req.query as any);
  return res.status(200).json({
    success: true,
    message: "Account transactions retrieved successfully",
    data: result.transactions,
    meta: result.meta,
  });
});

export const getDailyCashSheet = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getDailyCashSheet(req.query as any);
  return res.status(200).json({
    success: true,
    message: "Daily cash sheet generated successfully",
    data: result,
  });
});

export const getProfitLossStatement = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getProfitLossStatement(req.query as any);
  return res.status(200).json({
    success: true,
    message: "Profit & loss statement generated successfully",
    data: result,
  });
});
