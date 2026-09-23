import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";

import * as memberRepository from "../../member/repositories/member.repository.js";
import * as loanRepository from "../repositories/loan.repository.js";

import type {
  CreateLoanInput,
  LoanListQuery,
  UpdateLoanInput,
  DisburseLoanInput,
} from "../loan.types.js";

import { calculateLoan } from "../utils/loan-calculation.util.js";
import { getInstallmentSummary } from "../utils/installment-summary.util.js";

export const createLoan = async (data: CreateLoanInput) => {
  // 1. Check member exists
  const member = await memberRepository.findMemberById(data.memberId);

  if (!member) {
    throw new NotFoundError("Member not found");
  }

  // 2. Calculate loan
  const calculation = calculateLoan({
    principalAmount: data.principalAmount,
    chargeType: data.chargeType,
    chargeValue: data.chargeValue,
    installmentCount: data.installmentCount,
  });

  if (
    calculation.regularInstallmentCount > 0 &&
    calculation.installmentAmount === 0
  ) {
    throw new ValidationError(
      "Installment amount must be at least 10 for loans with multiple installments",
    );
  }

  // 3. Create PENDING loan
  const loan = await loanRepository.createLoan({
    ...data,

    chargeAmount: calculation.chargeAmount,
    totalPayable: calculation.totalPayable,
    installmentAmount: calculation.installmentAmount,
  });

  // 4. Generate business ID
  const loanId = `LN-${String(loan.id).padStart(6, "0")}`;

  // 5. Save business ID
  const updatedLoan = await loanRepository.updateLoanId(loan.id, loanId);

  if (!updatedLoan) {
    throw new NotFoundError("Failed to generate loan ID");
  }

  return {
    ...updatedLoan,
    ...getInstallmentSummary(updatedLoan),
  };
};

/**
 * Get all loans
 */
export const getAllLoans = async (query: LoanListQuery) => {
  const result = await loanRepository.findAllLoans(query);

  return {
    loans: result.loans.map((loan) => ({
      ...loan,
      ...getInstallmentSummary(loan),
    })),
    meta: result.meta,
  };
};

/**
 * Get loan by ID
 */
export const getLoanById = async (id: number) => {
  const loan = await loanRepository.findLoanById(id);

  if (!loan) {
    throw new NotFoundError("Loan not found");
  }

  return {
    ...loan,
    installments: [...loan.installments].sort(
      (left, right) => left.installmentNo - right.installmentNo,
    ),
    ...getInstallmentSummary(loan),
  };
};

export const updateLoan = async (id: number, data: UpdateLoanInput) => {
  const existingLoan = await loanRepository.findLoanById(id);
  if (!existingLoan) throw new NotFoundError("Loan not found");
  if (existingLoan.status !== "PENDING")
    throw new ConflictError("Only pending loans can be edited");

  if (data.memberId !== undefined && data.memberId !== existingLoan.memberId) {
    const member = await memberRepository.findMemberById(data.memberId);
    if (!member) throw new NotFoundError("Member not found");
  }

  const financialChange =
    data.principalAmount !== undefined ||
    data.chargeType !== undefined ||
    data.chargeValue !== undefined ||
    data.installmentCount !== undefined;
  const effectiveChargeType = data.chargeType ?? existingLoan.chargeType;
  const effectiveChargeValue =
    data.chargeValue ?? Number(existingLoan.chargeValue);
  if (effectiveChargeType === "PERCENTAGE" && effectiveChargeValue > 100)
    throw new ValidationError("Percentage charge cannot be greater than 100");
  const calculation = financialChange
    ? calculateLoan({
        principalAmount:
          data.principalAmount ?? Number(existingLoan.principalAmount),
        chargeType: effectiveChargeType,
        chargeValue: effectiveChargeValue,
        installmentCount:
          data.installmentCount ?? existingLoan.installmentCount,
      })
    : undefined;

  if (
    calculation &&
    calculation.regularInstallmentCount > 0 &&
    calculation.installmentAmount === 0
  )
    throw new ValidationError(
      "Installment amount must be at least 10 for loans with multiple installments",
    );

  const updated = await loanRepository.updatePendingLoanById(id, {
    ...data,
    ...(calculation && {
      chargeAmount: calculation.chargeAmount,
      totalPayable: calculation.totalPayable,
      installmentAmount: calculation.installmentAmount,
    }),
  });
  if (!updated) throw new ConflictError("Only pending loans can be edited");

  const loan = await loanRepository.findLoanById(id);
  if (!loan) throw new NotFoundError("Loan not found");
  return { ...loan, ...getInstallmentSummary(loan) };
};

export const approveLoan = async (id: number, userId: number) => {
  const loan = await loanRepository.findLoanById(id);
  if (!loan) throw new NotFoundError("Loan not found");
  if (loan.status !== "PENDING")
    throw new ConflictError("Only pending loans can be approved");
  if (
    !(await loanRepository.transitionPendingLoan(id, {
      status: "APPROVED",
      approvedById: userId,
    }))
  )
    throw new ConflictError("Only pending loans can be approved");
  return getLoanById(id);
};
export const rejectLoan = async (
  id: number,
  userId: number,
  rejectionReason: string,
) => {
  const loan = await loanRepository.findLoanById(id);
  if (!loan) throw new NotFoundError("Loan not found");
  if (loan.status !== "PENDING")
    throw new ConflictError("Only pending loans can be rejected");
  if (
    !(await loanRepository.transitionPendingLoan(id, {
      status: "REJECTED",
      rejectedById: userId,
      rejectionReason,
    }))
  )
    throw new ConflictError("Only pending loans can be rejected");
  return getLoanById(id);
};

export const disburseLoan = async (id: number, data: DisburseLoanInput) => {
  const loan = await loanRepository.findLoanById(id);
  if (!loan) throw new NotFoundError("Loan not found");
  if (loan.status !== "APPROVED")
    throw new ConflictError("Only approved loans can be disbursed");

  const disbursedLoan = await loanRepository.disburseApprovedLoan(id, data);
  if (!disbursedLoan) {
    throw new ConflictError("Only approved loans can be disbursed");
  }

  return getLoanById(id);
};
