import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/accounts/repositories/accounts.repository.js", () => ({
  listAccounts: vi.fn(),
  getAccountById: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  transferFunds: vi.fn(),
  injectCapital: vi.fn(),
  listTransactions: vi.fn(),
  getDailyCashSheet: vi.fn(),
  getProfitLossStatement: vi.fn(),
}));

import * as repository from "../../src/modules/accounts/repositories/accounts.repository.js";
import {
  createAccount,
  getAccountById,
  getDailyCashSheet,
  getProfitLossStatement,
  getTransactions,
  injectCapital,
  listAccounts,
  transferFunds,
  updateAccount,
} from "../../src/modules/accounts/services/accounts.service.js";

describe("Accounts Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAccounts", () => {
    it("returns list of financial accounts", async () => {
      const mockAccounts = [
        { id: 1, accountName: "Branch Main Cash", currentBalance: "5000", isDefault: true },
      ];
      vi.mocked(repository.listAccounts).mockResolvedValue(mockAccounts as any);

      const result = await listAccounts();
      expect(result).toEqual(mockAccounts);
      expect(repository.listAccounts).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAccountById", () => {
    it("throws NotFoundError when account does not exist", async () => {
      vi.mocked(repository.getAccountById).mockResolvedValue(null);

      await expect(getAccountById(99)).rejects.toThrow("Financial account not found");
    });

    it("returns the account if found", async () => {
      const mockAccount = { id: 1, accountName: "Branch Main Cash" };
      vi.mocked(repository.getAccountById).mockResolvedValue(mockAccount as any);

      const result = await getAccountById(1);
      expect(result).toEqual(mockAccount);
    });
  });

  describe("transferFunds", () => {
    it("rejects transfer when source and destination are identical", async () => {
      await expect(
        transferFunds({ fromAccountId: 1, toAccountId: 1, amount: 500 }, 1),
      ).rejects.toThrow("Source and destination accounts must be different");
    });

    it("delegates to repository when accounts are valid", async () => {
      vi.mocked(repository.transferFunds).mockResolvedValue({
        debitTx: { id: 1 },
        creditTx: { id: 2 },
      } as any);

      const result = await transferFunds(
        { fromAccountId: 1, toAccountId: 2, amount: 500, note: "Cash to Bank" },
        1,
      );

      expect(repository.transferFunds).toHaveBeenCalledWith(
        { fromAccountId: 1, toAccountId: 2, amount: 500, note: "Cash to Bank" },
        1,
      );
      expect(result).toBeDefined();
    });
  });

  describe("injectCapital", () => {
    it("delegates capital injection to repository", async () => {
      vi.mocked(repository.injectCapital).mockResolvedValue({ id: 1 } as any);

      const result = await injectCapital(
        { accountId: 1, amount: 50000, source: "Head Office Grant" },
        1,
      );

      expect(repository.injectCapital).toHaveBeenCalledWith(
        { accountId: 1, amount: 50000, source: "Head Office Grant" },
        1,
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe("getDailyCashSheet", () => {
    it("delegates to repository with given date query", async () => {
      vi.mocked(repository.getDailyCashSheet).mockResolvedValue({
        date: "2026-10-27",
        openingBalance: 0,
        cashIn: { total: 0, items: [] },
        cashOut: { total: 0, items: [] },
        closingBalance: 0,
      } as any);

      const result = await getDailyCashSheet({ date: "2026-10-27" });
      expect(repository.getDailyCashSheet).toHaveBeenCalledWith({ date: "2026-10-27" });
      expect(result.date).toBe("2026-10-27");
    });
  });

  describe("getProfitLossStatement", () => {
    it("delegates to repository with date range query", async () => {
      vi.mocked(repository.getProfitLossStatement).mockResolvedValue({
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        revenue: { total: 5000 },
        expense: { total: 2000 },
        netProfit: 3000,
      } as any);

      const result = await getProfitLossStatement({ startDate: "2026-10-01", endDate: "2026-10-31" });
      expect(repository.getProfitLossStatement).toHaveBeenCalledWith({ startDate: "2026-10-01", endDate: "2026-10-31" });
      expect(result.netProfit).toBe(3000);
    });
  });
});
