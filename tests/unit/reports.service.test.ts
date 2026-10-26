import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/reports/repositories/reports.repository.js", () => ({
  getDailyCollectionsReport: vi.fn(),
  getLoanPortfolioReport: vi.fn(),
  getOverdueInstallmentsReport: vi.fn(),
  getSavingsSummaryReport: vi.fn(),
}));

import * as repository from "../../src/modules/reports/repositories/reports.repository.js";
import {
  getDailyCollectionsReport,
  getLoanPortfolioReport,
  getOverdueInstallmentsReport,
  getSavingsSummaryReport,
} from "../../src/modules/reports/services/reports.service.js";

describe("Reports Service", () => {
  it("scopes daily collections report to actor userId when actor is FIELD_OFFICER", async () => {
    vi.mocked(repository.getDailyCollectionsReport).mockResolvedValue({
      summary: {
        totalTransactions: 1,
        totalLoanAmount: 1000,
        totalGeneralSavingsAmount: 100,
        totalSpecialSavingsAmount: 50,
        totalCollectedAmount: 1150,
      },
      records: [],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const result = await getDailyCollectionsReport(
      { startDate: "2026-10-01", endDate: "2026-10-26" },
      { userId: 42, role: "FIELD_OFFICER" },
    );

    expect(result).toBeDefined();
    expect(repository.getDailyCollectionsReport).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-10-01",
        endDate: "2026-10-26",
        fieldOfficerId: 42,
      }),
    );
  });

  it("leaves fieldOfficerId as provided in query when actor is ADMIN", async () => {
    vi.mocked(repository.getDailyCollectionsReport).mockResolvedValue({
      summary: {
        totalTransactions: 0,
        totalLoanAmount: 0,
        totalGeneralSavingsAmount: 0,
        totalSpecialSavingsAmount: 0,
        totalCollectedAmount: 0,
      },
      records: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await getDailyCollectionsReport(
      { somitiId: 10 },
      { userId: 1, role: "ADMIN" },
    );

    expect(repository.getDailyCollectionsReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        somitiId: 10,
        fieldOfficerId: undefined,
      }),
    );
  });

  it("scopes loan portfolio report to actor userId for FIELD_OFFICER", async () => {
    vi.mocked(repository.getLoanPortfolioReport).mockResolvedValue({
      summary: {
        totalLoans: 5,
        totalPrincipalDisbursed: 50000,
        totalPayable: 60000,
        totalRecovered: 20000,
        totalOutstanding: 40000,
      },
      records: [],
      meta: { page: 1, limit: 20, total: 5, totalPages: 1 },
    });

    const result = await getLoanPortfolioReport(
      { status: "ACTIVE" },
      { userId: 8, role: "FIELD_OFFICER" },
    );

    expect(result.summary.totalLoans).toBe(5);
    expect(repository.getLoanPortfolioReport).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACTIVE",
        fieldOfficerId: 8,
      }),
    );
  });

  it("scopes overdue report to actor userId for FIELD_OFFICER", async () => {
    vi.mocked(repository.getOverdueInstallmentsReport).mockResolvedValue({
      summary: {
        totalOverdueInstallments: 2,
        totalOverdueMembers: 2,
        totalOverdueAmount: 2500,
      },
      records: [],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    const result = await getOverdueInstallmentsReport(
      { minDaysOverdue: 7 },
      { userId: 8, role: "FIELD_OFFICER" },
    );

    expect(result.summary.totalOverdueAmount).toBe(2500);
    expect(repository.getOverdueInstallmentsReport).toHaveBeenCalledWith(
      expect.objectContaining({
        minDaysOverdue: 7,
        fieldOfficerId: 8,
      }),
    );
  });

  it("scopes savings summary report to actor userId for FIELD_OFFICER", async () => {
    vi.mocked(repository.getSavingsSummaryReport).mockResolvedValue({
      summary: {
        totalAccounts: 10,
        totalGeneralSavingsBalance: 15000,
        totalSpecialSavingsBalance: 5000,
        totalSavingsBalance: 20000,
      },
      records: [],
      meta: { page: 1, limit: 20, total: 10, totalPages: 1 },
    });

    const result = await getSavingsSummaryReport(
      { status: "ACTIVE" },
      { userId: 8, role: "FIELD_OFFICER" },
    );

    expect(result.summary.totalSavingsBalance).toBe(20000);
    expect(repository.getSavingsSummaryReport).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACTIVE",
        fieldOfficerId: 8,
      }),
    );
  });
});
