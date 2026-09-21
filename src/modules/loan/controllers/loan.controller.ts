import type { Request, Response } from "express";

import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";

import * as loanService from "../services/loan.service.js";

import type { CreateLoanInput, LoanListQuery, UpdateLoanInput, DisburseLoanInput } from "../loan.types.js";

export const createLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loanService.createLoan(req.body as CreateLoanInput);

  res.status(201).json(successResponse("Loan created successfully", loan));
});

export const getAllLoans = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await loanService.getAllLoans(
      req.query as unknown as LoanListQuery,
    );

    res
      .status(200)
      .json(paginatedResponse("Loans fetched successfully", result.loans, result.meta));
  },
);

export const getLoanById = asyncHandler(
  async (req: Request, res: Response) => {
    const loan = await loanService.getLoanById(Number(req.params.id));

    res.status(200).json(successResponse("Loan fetched successfully", loan));
  },
);

export const updateLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await loanService.updateLoan(Number(req.params.id), req.body as UpdateLoanInput);
  res.status(200).json(successResponse("Loan updated successfully", loan));
});
export const approveLoan = asyncHandler(async (req: Request, res: Response) => res.status(200).json(successResponse("Loan approved successfully", await loanService.approveLoan(Number(req.params.id), req.auth!.userId))));
export const rejectLoan = asyncHandler(async (req: Request, res: Response) => res.status(200).json(successResponse("Loan rejected successfully", await loanService.rejectLoan(Number(req.params.id), req.auth!.userId, req.body.rejectionReason))));
export const disburseLoan = asyncHandler(async (req: Request, res: Response) => res.status(200).json(successResponse("Loan disbursed successfully", await loanService.disburseLoan(Number(req.params.id), req.body as DisburseLoanInput))));
