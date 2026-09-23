import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../src/modules/dashboard/repositories/dashboard.repository.js",
  () => ({
    findDashboardAggregates: vi.fn(),
    findCollectionTrend: vi.fn(),
  }),
);

import * as repository from "../../src/modules/dashboard/repositories/dashboard.repository.js";
import { getDashboardSummary } from "../../src/modules/dashboard/services/dashboard.service.js";

const mockedAggregates = vi.mocked(repository.findDashboardAggregates);
const mockedTrend = vi.mocked(repository.findCollectionTrend);

describe("dashboard summary service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedAggregates.mockResolvedValue({
      totalMembers: 326,
      activeLoans: 87,
      loanPortfolio: {
        PENDING: 8,
        APPROVED: 3,
        ACTIVE: 87,
        COMPLETED: 142,
      },
      savings: { generalBalance: "380000", specialBalance: "160000.00" },
      todayCollections: {
        totalCollected: "38500",
        loanCollected: "32000",
        generalSavingsCollected: "4000",
        specialSavingsCollected: "2500",
      },
      savingsWithdrawn: "1000",
      loanFinancials: {
        totalPrincipal: "1100000",
        totalPayable: "1300000",
      },
      installments: {
        outstanding: { count: 200, amount: "1300000", paidAmount: "60000" },
        dueToday: { count: 18, amount: "50000", paidAmount: "5000" },
        overdue: { count: 14, amount: "30000", paidAmount: "2500" },
      },
    });
    mockedTrend.mockResolvedValue([
      {
        date: "2026-09-23",
        loanCollected: "32000",
        savingsCollected: "6500",
        totalCollected: "38500",
      },
    ]);
  });

  it("maps aggregates into the public dashboard response", async () => {
    const summary = await getDashboardSummary({
      date: "2026-09-23",
      trendDays: 7,
    });

    expect(summary).toMatchObject({
      operationalDate: "2026-09-23",
      overview: {
        totalMembers: 326,
        activeLoans: 87,
        totalPrincipal: "1100000.00",
        totalCharge: "200000.00",
        totalPayable: "1300000.00",
        totalLoanCollected: "60000.00",
        outstandingLoanAmount: "1240000.00",
        totalSavings: "540000.00",
      },
      today: {
        installmentsDue: 18,
        amountDue: "45000.00",
        savingsCollected: "6500.00",
        savingsWithdrawn: "1000.00",
      },
      attention: {
        overdueInstallments: 14,
        overdueAmount: "27500.00",
        pendingLoans: 8,
        approvedLoans: 3,
      },
      loanPortfolio: {
        pending: 8,
        approved: 3,
        active: 87,
        completed: 142,
        rejected: 0,
        cancelled: 0,
      },
    });
  });
});
