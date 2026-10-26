import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/income-expense/repositories/income-expense.repository.js", () => ({
  getCategories: vi.fn(),
  getCategoryById: vi.fn(),
  findCategoryByNameAndType: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  countCategoryTransactions: vi.fn(),
  getIncomeExpenseList: vi.fn(),
  getIncomeExpenseById: vi.fn(),
  createIncomeExpense: vi.fn(),
  updateIncomeExpense: vi.fn(),
  deleteIncomeExpense: vi.fn(),
}));

vi.mock("../../src/modules/somiti/repositories/somiti.repository.js", () => ({
  findSomitiById: vi.fn(),
}));

import * as repository from "../../src/modules/income-expense/repositories/income-expense.repository.js";
import { findSomitiById } from "../../src/modules/somiti/repositories/somiti.repository.js";
import {
  createCategory,
  createIncomeExpense,
  deleteCategory,
  deleteIncomeExpense,
  getCategories,
  getCategoryById,
  getIncomeExpenseById,
  updateCategory,
  updateIncomeExpense,
} from "../../src/modules/income-expense/services/income-expense.service.js";

describe("Income & Expense Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Category Management", () => {
    it("throws ConflictError when creating a category with duplicate name and type", async () => {
      vi.mocked(repository.findCategoryByNameAndType).mockResolvedValue({
        id: 1,
        name: "Office Rent",
        type: "EXPENSE",
      });

      await expect(
        createCategory({
          name: "Office Rent",
          type: "EXPENSE",
        }),
      ).rejects.toThrow("A expense category with this name already exists");
    });

    it("successfully creates a new category when name is unique", async () => {
      vi.mocked(repository.findCategoryByNameAndType).mockResolvedValue(null);
      vi.mocked(repository.createCategory).mockResolvedValue({
        id: 5,
        name: "Tea & Refreshment",
        type: "EXPENSE",
        description: null,
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
      });

      const result = await createCategory({
        name: "Tea & Refreshment",
        type: "EXPENSE",
      });

      expect(result.id).toBe(5);
      expect(result.name).toBe("Tea & Refreshment");
      expect(repository.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Tea & Refreshment", type: "EXPENSE" }),
      );
    });

    it("prevents deletion of default system categories", async () => {
      vi.mocked(repository.getCategoryById).mockResolvedValue({
        id: 1,
        name: "Staff Salary",
        type: "EXPENSE",
        description: null,
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(deleteCategory(1)).rejects.toThrow(
        "Default system categories cannot be deleted",
      );
    });

    it("prevents deletion of categories referenced by transactions", async () => {
      vi.mocked(repository.getCategoryById).mockResolvedValue({
        id: 2,
        name: "Custom Event",
        type: "EXPENSE",
        description: null,
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repository.countCategoryTransactions).mockResolvedValue(3);

      await expect(deleteCategory(2)).rejects.toThrow(
        "Cannot delete category because it is referenced by 3 transaction(s)",
      );
    });

    it("deletes custom category when it has no transactions", async () => {
      vi.mocked(repository.getCategoryById).mockResolvedValue({
        id: 3,
        name: "Unused Category",
        type: "EXPENSE",
        description: null,
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repository.countCategoryTransactions).mockResolvedValue(0);
      vi.mocked(repository.deleteCategory).mockResolvedValue({ id: 3 });

      const result = await deleteCategory(3);
      expect(result.id).toBe(3);
      expect(repository.deleteCategory).toHaveBeenCalledWith(3);
    });
  });

  describe("Voucher Transactions", () => {
    it("rejects voucher creation when category is inactive", async () => {
      vi.mocked(repository.getCategoryById).mockResolvedValue({
        id: 10,
        name: "Old Income",
        type: "INCOME",
        description: null,
        isSystem: false,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        createIncomeExpense(
          {
            type: "INCOME",
            categoryId: 10,
            amount: 500,
          },
          { userId: 1, role: "ADMIN" },
        ),
      ).rejects.toThrow("Selected transaction category is currently inactive");
    });

    it("rejects voucher creation when category type does not match transaction type", async () => {
      vi.mocked(repository.getCategoryById).mockResolvedValue({
        id: 11,
        name: "Office Rent",
        type: "EXPENSE",
        description: null,
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        createIncomeExpense(
          {
            type: "INCOME",
            categoryId: 11,
            amount: 5000,
          },
          { userId: 1, role: "ADMIN" },
        ),
      ).rejects.toThrow("Category 'Office Rent' is an EXPENSE category, but this transaction is marked as INCOME");
    });

    it("successfully creates a voucher transaction with valid inputs", async () => {
      vi.mocked(repository.getCategoryById).mockResolvedValue({
        id: 12,
        name: "Donation / Grant",
        type: "INCOME",
        description: null,
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repository.createIncomeExpense).mockResolvedValue({
        id: 101,
        voucherNo: "INC-20261026-0001",
        type: "INCOME",
        categoryId: 12,
        amount: 25000,
        date: new Date(),
        paymentMethod: "BANK_TRANSFER",
        reference: "CHQ-9812",
        description: "Annual community grant",
        somitiId: null,
        createdById: 1,
        createdAt: new Date(),
      });

      const result = await createIncomeExpense(
        {
          type: "INCOME",
          categoryId: 12,
          amount: 25000,
          paymentMethod: "BANK_TRANSFER",
          reference: "CHQ-9812",
          description: "Annual community grant",
        },
        { userId: 1, role: "ADMIN" },
      );

      expect(result.id).toBe(101);
      expect(result.voucherNo).toBe("INC-20261026-0001");
      expect(repository.createIncomeExpense).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "INCOME",
          categoryId: 12,
          amount: 25000,
        }),
        1,
      );
    });
  });
});
