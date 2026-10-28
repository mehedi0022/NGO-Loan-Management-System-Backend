import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";
import { findSomitiById } from "../../somiti/repositories/somiti.repository.js";
import type {
  CategoryQuery,
  CreateCategoryDTO,
  CreateIncomeExpenseDTO,
  IncomeExpenseQuery,
  UpdateCategoryDTO,
} from "../income-expense.types.js";
import * as repository from "../repositories/income-expense.repository.js";

type Actor = {
  userId: number;
  role: string;
};

// ----------------------------------------------------------------------------------
// Category Services
// ----------------------------------------------------------------------------------

export const getCategories = async (query: CategoryQuery = {}) => {
  return await repository.getCategories(query);
};

export const getCategoryById = async (id: number) => {
  const category = await repository.getCategoryById(id);
  if (!category) {
    throw new NotFoundError("Transaction category not found");
  }
  return category;
};

export const createCategory = async (data: CreateCategoryDTO) => {
  const existing = await repository.findCategoryByNameAndType(
    data.name.trim(),
    data.type,
  );
  if (existing) {
    throw new ConflictError(
      `A ${data.type.toLowerCase()} category with this name already exists`,
    );
  }

  return await repository.createCategory({
    ...data,
    name: data.name.trim(),
  });
};

export const updateCategory = async (id: number, data: UpdateCategoryDTO) => {
  const category = await repository.getCategoryById(id);
  if (!category) {
    throw new NotFoundError("Transaction category not found");
  }

  if (data.name || data.type) {
    const targetName = (data.name || category.name).trim();
    const targetType = data.type || (category.type as "INCOME" | "EXPENSE");

    const existing = await repository.findCategoryByNameAndType(
      targetName,
      targetType,
    );
    if (existing && existing.id !== id) {
      throw new ConflictError(
        `A ${targetType.toLowerCase()} category with this name already exists`,
      );
    }
  }

  return await repository.updateCategory(id, {
    ...data,
    ...(data.name && { name: data.name.trim() }),
  });
};

export const deleteCategory = async (id: number) => {
  const category = await repository.getCategoryById(id);
  if (!category) {
    throw new NotFoundError("Transaction category not found");
  }

  if (category.isSystem) {
    throw new ConflictError(
      "Default system categories cannot be deleted. You can deactivate it instead.",
    );
  }

  const transactionsCount = await repository.countCategoryTransactions(id);
  if (transactionsCount > 0) {
    throw new ConflictError(
      `Cannot delete category because it is referenced by ${transactionsCount} transaction(s). You can deactivate it instead.`,
    );
  }

  await repository.deleteCategory(id);
  return { id };
};

// ----------------------------------------------------------------------------------
// Income & Expense Voucher Services
// ----------------------------------------------------------------------------------

export const getIncomeExpenseList = async (
  query: IncomeExpenseQuery,
  _actor: Actor,
) => {
  return await repository.getIncomeExpenseList(query);
};

export const getIncomeExpenseById = async (id: number) => {
  const record = await repository.getIncomeExpenseById(id);
  if (!record) {
    throw new NotFoundError("Voucher transaction not found");
  }
  return record;
};

export const createIncomeExpense = async (
  data: CreateIncomeExpenseDTO,
  actor: Actor,
) => {
  // Validate category
  const category = await repository.getCategoryById(data.categoryId);
  if (!category) {
    throw new NotFoundError("Selected transaction category not found");
  }

  if (!category.isActive) {
    throw new ValidationError(
      "Selected transaction category is currently inactive",
    );
  }

  if (category.type !== data.type) {
    throw new ValidationError(
      `Category '${category.name}' is an ${category.type} category, but this transaction is marked as ${data.type}`,
    );
  }

  // Validate Somiti if specified
  if (data.somitiId) {
    const somiti = await findSomitiById(data.somitiId);
    if (!somiti) {
      throw new NotFoundError("Selected Somiti not found");
    }
  }

  return await repository.createIncomeExpense(data, actor.userId);
};

export const deleteIncomeExpense = async (
  id: number,
  reason = "Cancelled by admin",
  cancelledById?: number,
) => {
  const record = await repository.getIncomeExpenseById(id);
  if (!record) {
    throw new NotFoundError("Voucher transaction not found");
  }

  await repository.deleteIncomeExpense(id, reason, cancelledById);
  return { id, voucherNo: record.voucherNo };
};
