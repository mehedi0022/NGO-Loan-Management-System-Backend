import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  CategoryQuery,
  CreateCategoryDTO,
  CreateIncomeExpenseDTO,
  IncomeExpenseQuery,
  UpdateCategoryDTO,
  UpdateIncomeExpenseDTO,
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
    voucherQuery = voucherQuery.where({
      date: { gte: toInstant(from) },
    });
  }

  if (endDate) {
    const to = new Date(`${endDate}T23:59:59.999Z`);
    voucherQuery = voucherQuery.where({
      date: { lte: toInstant(to) },
    });
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
  const targetDate = data.date ? new Date(data.date) : new Date();
  const voucherNo = await generateVoucherNo(data.type, targetDate);

  return await db.orm.public.IncomeExpense.select(
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
};

export const updateIncomeExpense = async (
  id: number,
  data: UpdateIncomeExpenseDTO,
) => {
  const updatePayload: Record<string, any> = {};

  if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
  if (data.amount !== undefined) updatePayload.amount = data.amount as any;
  if (data.date !== undefined) {
    updatePayload.date = toInstant(new Date(data.date)) as any;
  }
  if (data.paymentMethod !== undefined) {
    updatePayload.paymentMethod = data.paymentMethod as any;
  }
  if (data.reference !== undefined) updatePayload.reference = data.reference;
  if (data.description !== undefined)
    updatePayload.description = data.description;
  if (data.somitiId !== undefined) updatePayload.somitiId = data.somitiId;

  return await db.orm.public.IncomeExpense.select(
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
    "updatedAt",
  )
    .where({ id })
    .update(updatePayload);
};

export const deleteIncomeExpense = async (id: number) => {
  return await db.orm.public.IncomeExpense.select("id")
    .where({ id })
    .delete();
};
