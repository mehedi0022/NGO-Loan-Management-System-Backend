import { describe, expect, it } from "vitest";
import { calculateDpsMaturity } from "../../src/modules/dps/dps.repository.js";

describe("DPS Calculation Engine", () => {
  it("calculates 5-year DPS correctly using statutory recurring deposit formula", () => {
    // 1000 Tk/month, 60 months (5 yrs), 8.5% annual rate
    const result = calculateDpsMaturity(1000, 60, 8.5);
    expect(result.totalPrincipal).toBe("60000.00");
    // (1000 * 60 * 61 * 8.5) / 2400 = 12962.50
    expect(result.profit).toBe("12962.50");
    expect(result.maturityAmount).toBe("72962.50");
  });

  it("calculates 3-year DPS correctly", () => {
    // 500 Tk/month, 36 months (3 yrs), 8.0% annual rate
    const result = calculateDpsMaturity(500, 36, 8.0);
    expect(result.totalPrincipal).toBe("18000.00");
    // (500 * 36 * 37 * 8) / 2400 = 2220.00
    expect(result.profit).toBe("2220.00");
    expect(result.maturityAmount).toBe("20220.00");
  });
});
