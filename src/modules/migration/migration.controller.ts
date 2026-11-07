import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./migration.service.js";

export const migrateSingleMemberController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const result = await service.migrateSingle(req.body, userId);
    return res.status(201).json({
      success: true,
      message: `Legacy member ${result.fullName} (${result.memberCode}) migrated successfully`,
      data: result,
    });
  },
);

export const migrateBatchMembersController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId;
    const result = await service.migrateBatch(req.body, userId);
    return res.status(200).json({
      success: true,
      message: `Batch migration complete. Processed: ${result.totalProcessed}, Success: ${result.successfulCount}, Failed: ${result.failedCount}`,
      data: result,
    });
  },
);

export const getTemplateController = asyncHandler(
  async (_req: Request, res: Response) => {
    const columns = service.getTemplateColumns();
    return res.status(200).json({
      success: true,
      message: "Migration template format retrieved successfully",
      data: {
        columns,
        sampleRow: {
          memberId: "M-1001",
          fullName: "Md. Rafiqul Islam",
          fatherName: "Abdul Gafur",
          motherName: "Rahima Begum",
          mobileNumber: "01712345678",
          nidNumber: "19851234567890123",
          somitiId: 1,
          joinDate: "2024-01-15",
          village: "Bhatpara",
          postOffice: "Bhatpara",
          upazila: "Kushtia Sadar",
          district: "Kushtia",
          generalSavingsBalance: 5000,
          specialSavingsBalance: 1000,
          loanPrincipal: 50000,
          loanChargeValue: 10,
          loanInstallmentCount: 46,
          loanFrequency: "WEEKLY",
          loanDisbursementDate: "2025-06-01",
          loanFirstDueDate: "2025-06-08",
          loanPaidInstallments: 20,
          dpsInstallmentAmount: 500,
          dpsDurationMonths: 36,
          dpsInterestRate: 8,
          dpsStartDate: "2025-01-01",
          dpsPaidInstallments: 10,
        },
      },
    });
  },
);
