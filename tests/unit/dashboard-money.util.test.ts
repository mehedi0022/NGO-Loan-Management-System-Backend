import { describe, expect, it } from "vitest";

import {
  addMoney,
  moneyToMinorUnits,
  normalizeMoney,
  remainingMoney,
} from "../../src/modules/dashboard/utils/dashboard-money.util.js";

describe("dashboard money helpers", () => {
  it("adds decimal money without floating-point drift", () => {
    expect(addMoney("0.10", "0.20", "1000000000000.30")).toBe(
      "1000000000000.60",
    );
  });

  it("calculates remaining balances and never reports a negative amount", () => {
    expect(remainingMoney("1000.00", "250.25")).toBe("749.75");
    expect(remainingMoney("100.00", "120.00")).toBe("0.00");
  });

  it("normalizes aggregate decimals to two places", () => {
    expect(normalizeMoney("42")).toBe("42.00");
    expect(normalizeMoney("42.5")).toBe("42.50");
  });

  it("rejects precision that cannot be represented as currency minor units", () => {
    expect(() => moneyToMinorUnits("1.001")).toThrow(RangeError);
  });
});
