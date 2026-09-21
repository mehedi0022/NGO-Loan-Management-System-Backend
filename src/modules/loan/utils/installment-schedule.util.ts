import { Temporal } from "temporal-polyfill";

export type InstallmentFrequency = "WEEKLY" | "MONTHLY";

export type InstallmentScheduleInput = {
  totalPayable: string;
  installmentCount: number;
  installmentAmount: string;
  frequency: InstallmentFrequency;
  firstDueDate: Temporal.PlainDate;
};

export type GeneratedInstallment = {
  installmentNo: number;
  dueDate: Temporal.PlainDate;
  amount: string;
};

const toPaisa = (amount: string) => Math.round(Number(amount) * 100);

const formatMoney = (amountInPaisa: number) =>
  (amountInPaisa / 100).toFixed(2);

const getMonthlyDueDate = (
  firstDueDate: Temporal.PlainDate,
  monthsAfterFirstDueDate: number,
) => {
  const targetMonth = firstDueDate
    .with({ day: 1 })
    .add({ months: monthsAfterFirstDueDate });

  return targetMonth.with({
    day: Math.min(firstDueDate.day, targetMonth.daysInMonth),
  });
};

const getDueDate = (
  firstDueDate: Temporal.PlainDate,
  frequency: InstallmentFrequency,
  index: number,
) =>
  frequency === "WEEKLY"
    ? firstDueDate.add({ weeks: index })
    : getMonthlyDueDate(firstDueDate, index);

/**
 * Builds a repayment schedule from persisted loan values. The last installment
 * receives the exact remaining paisa so all generated amounts equal totalPayable.
 */
export const generateInstallmentSchedule = ({
  totalPayable,
  installmentCount,
  installmentAmount,
  frequency,
  firstDueDate,
}: InstallmentScheduleInput): GeneratedInstallment[] => {
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new Error("Installment count must be at least 1");
  }

  const totalPayableInPaisa = toPaisa(totalPayable);
  const regularInstallmentInPaisa = toPaisa(installmentAmount);
  const regularInstallmentCount = installmentCount - 1;
  const lastInstallmentInPaisa =
    totalPayableInPaisa -
    regularInstallmentInPaisa * regularInstallmentCount;

  if (lastInstallmentInPaisa < 0) {
    throw new Error("Installment amounts exceed total payable");
  }

  return Array.from({ length: installmentCount }, (_, index) => ({
    installmentNo: index + 1,
    dueDate: getDueDate(firstDueDate, frequency, index),
    amount: formatMoney(
      index === regularInstallmentCount
        ? lastInstallmentInPaisa
        : regularInstallmentInPaisa,
    ),
  }));
};
