import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.middleware.js";
import * as service from "../services/reports.service.js";
import type {
  DailyCollectionReportQuery,
  LoanPortfolioReportQuery,
  OverdueReportQuery,
  SavingsSummaryReportQuery,
} from "../reports.types.js";

export const getDailyCollectionsReport = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await service.getDailyCollectionsReport(
      req.query as unknown as DailyCollectionReportQuery,
      auth,
    );

    return res.status(200).json({
      success: true,
      message: "Daily collections report fetched successfully",
      data: result.records,
      summary: result.summary,
      meta: result.meta,
    });
  },
);

export const getLoanPortfolioReport = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await service.getLoanPortfolioReport(
      req.query as unknown as LoanPortfolioReportQuery,
      auth,
    );

    return res.status(200).json({
      success: true,
      message: "Loan portfolio report fetched successfully",
      data: result.records,
      summary: result.summary,
      meta: result.meta,
    });
  },
);

export const getOverdueInstallmentsReport = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await service.getOverdueInstallmentsReport(
      req.query as unknown as OverdueReportQuery,
      auth,
    );

    return res.status(200).json({
      success: true,
      message: "Overdue installments report fetched successfully",
      data: result.records,
      summary: result.summary,
      meta: result.meta,
    });
  },
);

export const getSavingsSummaryReport = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await service.getSavingsSummaryReport(
      req.query as unknown as SavingsSummaryReportQuery,
      auth,
    );

    return res.status(200).json({
      success: true,
      message: "Savings summary report fetched successfully",
      data: result.records,
      summary: result.summary,
      meta: result.meta,
    });
  },
);
