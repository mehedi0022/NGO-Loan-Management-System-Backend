type InstallmentSummarySource = {
  totalPayable: string;
  installmentCount: number;
  installmentAmount: string;
};

const toPaisa = (amount: string) => Math.round(Number(amount) * 100);

const formatMoney = (amountInPaisa: number) =>
  (amountInPaisa / 100).toFixed(2);

/**
 * Derives the repayment distribution from stored Loan fields.
 * The final installment always absorbs the exact remaining balance.
 */
export const getInstallmentSummary = ({
  totalPayable,
  installmentCount,
  installmentAmount,
}: InstallmentSummarySource) => {
  const regularInstallmentCount = Math.max(installmentCount - 1, 0);
  const lastInstallmentAmount =
    toPaisa(totalPayable) -
    toPaisa(installmentAmount) * regularInstallmentCount;

  return {
    regularInstallmentCount,
    lastInstallmentAmount: formatMoney(lastInstallmentAmount),
  };
};
