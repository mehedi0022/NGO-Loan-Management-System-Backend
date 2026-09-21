import type { CreateLoanInput } from "../loan.types.js";

type LoanCalculationInput = Pick<
  CreateLoanInput,
  "principalAmount" | "chargeType" | "chargeValue" | "installmentCount"
>;

export interface LoanCalculationResult {
  chargeAmount: number;
  totalPayable: number;
  installmentAmount: number;
  regularInstallmentCount: number;
  lastInstallmentAmount: number;
}

const roundMoney = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const calculateLoan = ({
  principalAmount,
  chargeType,
  chargeValue,
  installmentCount,
}: LoanCalculationInput): LoanCalculationResult => {
  const chargeAmount =
    chargeType === "PERCENTAGE"
      ? roundMoney((principalAmount * chargeValue) / 100)
      : roundMoney(chargeValue);

  const totalPayable = roundMoney(principalAmount + chargeAmount);

  const totalPayableInPaisa = Math.round(totalPayable * 100);
  const regularInstallmentCount = Math.max(installmentCount - 1, 0);

  // A single-installment loan has no regular installments; its final amount is
  // the complete payable balance.
  const installmentAmount =
    installmentCount === 1
      ? totalPayable
      : Math.floor(totalPayableInPaisa / installmentCount / 1000) * 10;

  const lastInstallmentAmount =
    (totalPayableInPaisa -
      Math.round(installmentAmount * 100) * regularInstallmentCount) /
    100;

  return {
    chargeAmount,
    totalPayable,
    installmentAmount,
    regularInstallmentCount,
    lastInstallmentAmount,
  };
};
