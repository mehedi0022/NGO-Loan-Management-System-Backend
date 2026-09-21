import { describe, expect, it } from "vitest";

import { calculateLoan } from "../../src/modules/loan/utils/loan-calculation.util.js";
import { getInstallmentSummary } from "../../src/modules/loan/utils/installment-summary.util.js";

describe("loan installment calculation", () => {
  it("rounds regular installments down to the lower multiple of 10", () => {
    const loan = calculateLoan({
      principalAmount: 50000,
      chargeType: "PERCENTAGE",
      chargeValue: 10,
      installmentCount: 12,
    });

    expect(loan).toMatchObject({
      chargeAmount: 5000,
      totalPayable: 55000,
      installmentAmount: 4580,
      regularInstallmentCount: 11,
      lastInstallmentAmount: 4620,
    });
  });

  it("does not use nearest-10 rounding", () => {
    const loan = calculateLoan({
      principalAmount: 55044,
      chargeType: "FLAT",
      chargeValue: 0,
      installmentCount: 12,
    });

    expect(loan.installmentAmount).toBe(4580);
    expect(loan.lastInstallmentAmount).toBe(4664);
  });

  it("keeps an exact lower-10 division unchanged", () => {
    const loan = calculateLoan({
      principalAmount: 55080,
      chargeType: "FLAT",
      chargeValue: 0,
      installmentCount: 12,
    });

    expect(loan.installmentAmount).toBe(4590);
    expect(loan.lastInstallmentAmount).toBe(4590);
  });

  it("keeps a one-installment loan as one final installment", () => {
    const loan = calculateLoan({
      principalAmount: 50000,
      chargeType: "PERCENTAGE",
      chargeValue: 10,
      installmentCount: 1,
    });

    expect(loan).toMatchObject({
      installmentAmount: 55000,
      regularInstallmentCount: 0,
      lastInstallmentAmount: 55000,
    });
  });

  it("derives the final amount from persisted money values exactly", () => {
    expect(
      getInstallmentSummary({
        totalPayable: "55000.00",
        installmentCount: 12,
        installmentAmount: "4580.00",
      }),
    ).toEqual({ regularInstallmentCount: 11, lastInstallmentAmount: "4620.00" });
  });

  it("derives a single installment without regular zero-value installments", () => {
    expect(
      getInstallmentSummary({
        totalPayable: "55000.00",
        installmentCount: 1,
        installmentAmount: "55000.00",
      }),
    ).toEqual({ regularInstallmentCount: 0, lastInstallmentAmount: "55000.00" });
  });
});
