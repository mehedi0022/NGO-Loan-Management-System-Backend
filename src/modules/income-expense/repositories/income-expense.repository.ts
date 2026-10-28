import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { ValidationError } from "../../../errors/AppError.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import { recordTransaction } from "../../accounts/repositories/accounts.repository.js";
import type {
  CategoryQuery,
  CreateCategoryDTO,
  CreateIncomeExpenseDTO,
  IncomeExpenseQuery,
  UpdateCategoryDTO,
} from "../income-expense.types.js";

const toInstant = (date: Date) => Temporal.Instant.from(date.toISOString());

const toNumber = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

// ----------------------------------------------------------------------------------
// 1. Transaction Category Repository Operations
// ----------------------------------------------------------------------------------

export const getCategories = async (query: CategoryQuery = {}) => {
  const { type, isActive } = query;

  let categoryQuery = db.orm.public.TransactionCategory.select(
    "id",
    "name",
    "type",
    "description",
    "isSystem",
    "isActive",
    "createdAt",
    "updatedAt",
  );

  if (type && type !== "ALL") {
    categoryQuery = categoryQuery.where({ type: type as any });
  }

  if (typeof isActive === "boolean") {
    categoryQuery = categoryQuery.where({ isActive });
  }

  return await categoryQuery
    .orderBy((c) => c.name.asc())
    .all();
};

export const getCategoryById = async (id: number) => {
  return await db.orm.public.TransactionCategory.select(
    "id",
    "name",
    "type",
    "description",
    "isSystem",
    "isActive",
    "createdAt",
    "updatedAt",
  ).first({ id });
};

export const findCategoryByNameAndType = async (name: string, type: "INCOME" | "EXPENSE") => {
  return await db.orm.public.TransactionCategory.select("id", "name", "type").first({
    name,
    type: type as any,
  });
};

export const createCategory = async (data: CreateCategoryDTO) => {
  return await db.orm.public.TransactionCategory.select(
    "id",
    "name",
    "type",
    "description",
    "isSystem",
    "isActive",
    "createdAt",
  ).create({
    name: data.name,
    type: data.type as any,
    description: data.description ?? null,
    isSystem: false,
    isActive: data.isActive ?? true,
  });
};

export const updateCategory = async (id: number, data: UpdateCategoryDTO) => {
  const updatePayload: Record<string, any> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.type !== undefined) updatePayload.type = data.type as any;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

  return await db.orm.public.TransactionCategory.select(
    "id",
    "name",
    "type",
    "description",
    "isSystem",
    "isActive",
    "updatedAt",
  )
    .where({ id })
    .update(updatePayload);
};

export const deleteCategory = async (id: number) => {
  return await db.orm.public.TransactionCategory.select("id")
    .where({ id })
    .delete();
};

export const countCategoryTransactions = async (categoryId: number) => {
  const transactions = await db.orm.public.IncomeExpense.select("id")
    .where({ categoryId })
    .all();
  return transactions.length;
};

// ----------------------------------------------------------------------------------
// 2. Voucher Number Generator Helper
// ----------------------------------------------------------------------------------

export const generateVoucherNo = async (type: "INCOME" | "EXPENSE", date: Date) => {
  const prefix = type === "INCOME" ? "INC" : "EXP";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const searchPrefix = `${prefix}-${dateStr}-`;

  const existing = await db.orm.public.IncomeExpense.select("voucherNo")
    .orderBy((v) => v.id.desc())
    .all();

  const matching = existing
    .map((v) => v.voucherNo)
    .filter((vno) => vno.startsWith(searchPrefix));

  let nextSequence = 1;
  if (matching.length > 0) {
    const numbers = matching
      .map((vno) => {
        const parts = vno.split("-");
        const num = parseInt(parts[2], 10);
        return isNaN(num) ? 0 : num;
      })
      .filter((n) => n > 0);

    if (numbers.length > 0) {
      nextSequence = Math.max(...numbers) + 1;
    }
  }

  const seqStr = String(nextSequence).padStart(4, "0");
  return `${prefix}-${dateStr}-${seqStr}`;
};

// ----------------------------------------------------------------------------------
// 3. Income & Expense Voucher Operations
// ----------------------------------------------------------------------------------

export const getIncomeExpenseList = async (query: IncomeExpenseQuery = {}) => {
  const {
    page = 1,
    limit = 20,
    type,
    categoryId,
    somitiId,
    paymentMethod,
    startDate,
    endDate,
    search,
  } = query;

  let voucherQuery = db.orm.public.IncomeExpense.select(
    "id",
    "voucherNo",
    "type",
    "categoryId",
    "amount",
    "date",
    "paymentMethod",
    "reference",
    "description",
    "somitiId",
    "createdById",
    "createdAt",
    "updatedAt",
  )
    .include("category", (cat) =>
      cat.select("id", "name", "type", "description"),
    )
    .include("somiti", (somiti) =>
      somiti.select("id", "somitiId", "name", "code"),
    )
    .include("createdBy", (user) =>
      user.select("id", "userName", "fullName", "role"),
    );

  if (type && type !== "ALL") {
    voucherQuery = voucherQuery.where({ type: type as any });
  }

  if (categoryId) {
    voucherQuery = voucherQuery.where({ categoryId });
  }

  if (somitiId) {
    voucherQuery = voucherQuery.where({ somitiId });
  }

  if (paymentMethod && paymentMethod !== "ALL") {
    voucherQuery = voucherQuery.where({ paymentMethod: paymentMethod as any });
  }

  if (startDate) {
    const from = new Date(`${startDate}T00:00:00.000Z`);
    const fromInstant = toInstant(from);
    voucherQuery = voucherQuery.where((v) => v.date.gte(fromInstant));
  }

  if (endDate) {
    const to = new Date(`${endDate}T23:59:59.999Z`);
    const toInstantVal = toInstant(to);
    voucherQuery = voucherQuery.where((v) => v.date.lte(toInstantVal));
  }

  const allRecords = await voucherQuery
    .orderBy((v) => v.date.desc())
    .all();

  // Search filter (voucherNo, reference, description, category name)
  let filtered = allRecords;
  if (search) {
    const q = search.toLowerCase();
    filtered = allRecords.filter((item) => {
      return (
        item.voucherNo.toLowerCase().includes(q) ||
        (item.reference && item.reference.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category?.name && item.category.name.toLowerCase().includes(q)) ||
        (item.somiti?.name && item.somiti.name.toLowerCase().includes(q))
      );
    });
  }

  const total = filtered.length;
  const offset = pageOffset(page, limit);
  const pagedRecords = filtered.slice(offset, offset + limit);

  // Compute summary figures
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  filtered.forEach((r) => {
    const amount = toNumber(r.amount);
    if (r.type === "INCOME") {
      totalIncome += amount;
      incomeCount++;
    } else {
      totalExpense += amount;
      expenseCount++;
    }
  });

  return {
    summary: {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      incomeCount,
      expenseCount,
      totalCount: total,
    },
    records: pagedRecords.map((r) => ({
      id: r.id,
      voucherNo: r.voucherNo,
      type: r.type,
      category: r.category
        ? {
            id: r.category.id,
            name: r.category.name,
            type: r.category.type,
          }
        : null,
      amount: toNumber(r.amount),
      date: r.date,
      paymentMethod: r.paymentMethod,
      reference: r.reference,
      description: r.description,
      somiti: r.somiti
        ? {
            id: r.somiti.id,
            somitiId: r.somiti.somitiId,
            name: r.somiti.name,
            code: r.somiti.code,
          }
        : null,
      createdBy: r.createdBy
        ? {
            id: r.createdBy.id,
            userName: r.createdBy.userName,
            fullName: r.createdBy.fullName,
            role: r.createdBy.role,
          }
        : null,
      createdAt: r.createdAt,
    })),
    meta: paginationMeta(page, limit, total),
  };
};

export const getIncomeExpenseById = async (id: number) => {
  const record = await db.orm.public.IncomeExpense.select(
    "id",
    "voucherNo",
    "type",
    "categoryId",
    "amount",
    "date",
    "paymentMethod",
    "reference",
    "description",
    "somitiId",
    "createdById",
    "createdAt",
    "updatedAt",
  )
    .include("category", (cat) =>
      cat.select("id", "name", "type", "description"),
    )
    .include("somiti", (somiti) =>
      somiti.select("id", "somitiId", "name", "code"),
    )
    .include("createdBy", (user) =>
      user.select("id", "userName", "fullName", "role"),
    )
    .first({ id });

  if (!record) return null;

  return {
    id: record.id,
    voucherNo: record.voucherNo,
    type: record.type,
    category: record.category,
    amount: toNumber(record.amount),
    date: record.date,
    paymentMethod: record.paymentMethod,
    reference: record.reference,
    description: record.description,
    somiti: record.somiti,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const createIncomeExpense = async (
  data: CreateIncomeExpenseDTO,
  createdById: number,
) => {
  return await db.transaction(async (tx) => {
    const targetDate = data.date ? new Date(data.date) : new Date();
    const requiredAmount = Number(data.amount) || 0;

    // Find the appropriate financial account based on payment method
    let targetAccount = null;
    if (data.paymentMethod === "BANK_TRANSFER") {
      targetAccount =
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ accountType: "BANK", isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ isDefault: true, isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ isActive: true }));
    } else if (data.paymentMethod === "MOBILE_PAYMENT") {
      targetAccount =
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ accountType: "MOBILE_BANKING", isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ isDefault: true, isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ isActive: true }));
    } else {
      targetAccount =
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ isDefault: true, isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance", "isActive")
          .first({ isActive: true }));
    }

    if (!targetAccount) {
      throw new ValidationError(
        "No active financial account found for transaction. Please create a Cash or Bank account in Accounts & Cash.",
      );
    }

    // Check financial account balance for expense vouchers (just like loan disbursement)
    if (data.type === "EXPENSE" && requiredAmount > 0) {
      const availableBalance = Number(targetAccount.currentBalance) || 0;
      if (availableBalance < requiredAmount) {
        const shortage = requiredAmount - availableBalance;
        throw new ValidationError(
          `Insufficient balance in ${targetAccount.accountName}. Available: ৳${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}, Required: ৳${requiredAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} (Shortage: ৳${shortage.toLocaleString("en-US", { minimumFractionDigits: 2 })}). Expense voucher cannot be created without sufficient funds. Please inject capital or collect funds first.`,
        );
      }
    }

    const voucherNo = await generateVoucherNo(data.type, targetDate);

    const voucher = await tx.orm.public.IncomeExpense.select(
      "id",
      "voucherNo",
      "type",
      "categoryId",
      "amount",
      "date",
      "paymentMethod",
      "reference",
      "description",
      "somitiId",
      "createdById",
      "createdAt",
    ).create({
      voucherNo,
      type: data.type as any,
      categoryId: data.categoryId,
      amount: data.amount as any,
      date: toInstant(targetDate) as any,
      paymentMethod: (data.paymentMethod || "CASH") as any,
      reference: data.reference ?? null,
      description: data.description ?? null,
      somitiId: data.somitiId ?? null,
      createdById,
    });

    // Auto-record in financial accounting ledger
    if (requiredAmount > 0) {
      await recordTransaction(tx, {
        accountId: targetAccount.id,
        type: data.type === "INCOME" ? "DEBIT" : "CREDIT",
        amount: requiredAmount,
        sourceModule: data.type === "INCOME" ? "OTHER_INCOME" : "OFFICE_EXPENSE",
        referenceId: voucher.voucherNo,
        description: data.description || `${data.type} voucher ${voucher.voucherNo}`,
        transactionDate: targetDate,
        createdById,
      });
    }

    return voucher;
  });
};

export const deleteIncomeExpense = async (
  id: number,
  reason = "Cancelled by admin",
  cancelledById?: number,
) => {
  const existing = await db.orm.public.IncomeExpense.select(
    "id",
    "voucherNo",
    "type",
    "amount",
  ).first({ id });

  if (existing) {
    try {
      const defaultAccount =
        (await db.orm.public.FinancialAccount.select("id")
          .first({ isDefault: true, isActive: true })) ||
        (await db.orm.public.FinancialAccount.select("id")
          .first({ isActive: true }));

      if (defaultAccount && Number(existing.amount) > 0) {
        await recordTransaction(db, {
          accountId: defaultAccount.id,
          type: existing.type === "INCOME" ? "CREDIT" : "DEBIT",
          amount: Number(existing.amount),
          sourceModule: existing.type === "INCOME" ? "OTHER_INCOME" : "OFFICE_EXPENSE",
          referenceId: existing.voucherNo,
          description: `Voucher reversed (${existing.voucherNo}): ${reason}`,
          createdById: cancelledById,
        });
      }
    } catch (err) {
      console.warn("Could not reverse income-expense accounting transaction:", err);
    }
  }

  return await db.orm.public.IncomeExpense.select("id")
    .where({ id })
    .delete();
};
