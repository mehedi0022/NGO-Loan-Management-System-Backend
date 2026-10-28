import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  AccountSourceModule,
  AccountTransactionType,
  CreateAccountInput,
  DailyCashSheetQuery,
  InjectCapitalInput,
  ListTransactionsQuery,
  ProfitLossQuery,
  TransferFundsInput,
  UpdateAccountInput,
} from "../accounts.types.js";

const toInstant = (dateVal: string | Date | Temporal.Instant | null | undefined): Temporal.Instant => {
  if (!dateVal) {
    return Temporal.Now.instant();
  }
  if (dateVal instanceof Temporal.Instant) {
    return dateVal;
  }
  if (dateVal instanceof Date) {
    return Temporal.Instant.from(dateVal.toISOString());
  }
  if (typeof dateVal === "string") {
    if (dateVal.includes("T")) {
      return Temporal.Instant.from(dateVal);
    }
    const now = Temporal.Now.zonedDateTimeISO("Asia/Dhaka");
    const [y, m, d] = dateVal.split("-").map(Number);
    if (y && m && d) {
      return Temporal.ZonedDateTime.from({
        timeZone: "Asia/Dhaka",
        year: y,
        month: m,
        day: d,
        hour: now.hour,
        minute: now.minute,
        second: now.second,
      }).toInstant();
    }
    return Temporal.Instant.from(`${dateVal}T00:00:00Z`);
  }
  return Temporal.Now.instant();
};

const toAmount = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

// ----------------------------------------------------------------------------------
// 1. Financial Accounts Management
// ----------------------------------------------------------------------------------

export const listAccounts = async () => {
  const allAccounts = await db.orm.public.FinancialAccount.select(
    "id",
    "accountName",
    "accountType",
    "accountNumber",
    "bankName",
    "branchName",
    "currentBalance",
    "isDefault",
    "isActive",
    "notes",
    "createdAt",
    "updatedAt",
  )
    .orderBy((a) => a.id.asc())
    .all();

  // Sort default account first
  const accounts = [...allAccounts].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

  const totalCash = accounts
    .filter((a) => a.accountType === "CASH" && a.isActive)
    .reduce((sum, a) => sum + toAmount(a.currentBalance), 0);

  const totalBank = accounts
    .filter((a) => (a.accountType === "BANK" || a.accountType === "MOBILE_BANKING") && a.isActive)
    .reduce((sum, a) => sum + toAmount(a.currentBalance), 0);

  const totalFunds = totalCash + totalBank;

  return {
    accounts,
    summary: {
      totalCash,
      totalBank,
      totalFunds,
    },
  };
};

export const getAccountById = async (id: number) => {
  return await db.orm.public.FinancialAccount.select(
    "id",
    "accountName",
    "accountType",
    "accountNumber",
    "bankName",
    "branchName",
    "currentBalance",
    "isDefault",
    "isActive",
    "notes",
    "createdAt",
    "updatedAt",
  ).first({ id });
};

export const getDefaultAccount = async () => {
  const defaultAcc = await db.orm.public.FinancialAccount.select(
    "id",
    "accountName",
    "accountType",
    "currentBalance",
  ).first({ isDefault: true, isActive: true });

  if (defaultAcc) return defaultAcc;

  // Fallback to first active cash account
  return await db.orm.public.FinancialAccount.select(
    "id",
    "accountName",
    "accountType",
    "currentBalance",
  ).first({ isActive: true });
};

export const createAccount = async (data: CreateAccountInput, userId?: number) => {
  return await db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx.orm.public.FinancialAccount.where({ isDefault: true }).update({
        isDefault: false,
      });
    }

    const account = await tx.orm.public.FinancialAccount.select(
      "id",
      "accountName",
      "accountType",
      "accountNumber",
      "bankName",
      "branchName",
      "currentBalance",
      "isDefault",
      "isActive",
      "notes",
    ).create({
      accountName: data.accountName,
      accountType: data.accountType || "CASH",
      accountNumber: data.accountNumber || null,
      bankName: data.bankName || null,
      branchName: data.branchName || null,
      currentBalance: "0",
      isDefault: Boolean(data.isDefault),
      isActive: true,
      notes: data.notes || null,
    });

    const initBal = toAmount(data.initialBalance);
    if (initBal > 0) {
      await recordTransaction(tx, {
        accountId: account.id,
        type: "DEBIT",
        amount: initBal,
        sourceModule: "CAPITAL_INJECTION",
        referenceId: `ACC-${account.id}`,
        description: "Initial opening balance / capital",
        createdById: userId,
      });
    }

    return await tx.orm.public.FinancialAccount.select(
      "id",
      "accountName",
      "accountType",
      "currentBalance",
    ).first({ id: account.id });
  });
};

export const updateAccount = async (id: number, data: UpdateAccountInput) => {
  return await db.transaction(async (tx) => {
    if (data.isDefault) {
      await tx.orm.public.FinancialAccount.where({ isDefault: true }).update({
        isDefault: false,
      });
    }

    await tx.orm.public.FinancialAccount.where({ id }).update({
      ...(data.accountName && { accountName: data.accountName }),
      ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber || null }),
      ...(data.bankName !== undefined && { bankName: data.bankName || null }),
      ...(data.branchName !== undefined && { branchName: data.branchName || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    });

    return await tx.orm.public.FinancialAccount.select(
      "id",
      "accountName",
      "accountType",
      "currentBalance",
      "isDefault",
      "isActive",
    ).first({ id });
  });
};

// ----------------------------------------------------------------------------------
// 2. Core Ledger & Transaction Recording
// ----------------------------------------------------------------------------------

export interface RecordTransactionInput {
  accountId: number;
  type: AccountTransactionType;
  amount: number;
  sourceModule: AccountSourceModule;
  referenceId?: string;
  description?: string;
  transactionDate?: string | Date | Temporal.Instant | null;
  createdById?: number;
}

export const recordTransaction = async (
  tx: any,
  input: RecordTransactionInput,
) => {
  const account = await tx.orm.public.FinancialAccount.select(
    "id",
    "accountName",
    "currentBalance",
  ).first({ id: input.accountId });

  if (!account) {
    throw new Error(`Financial account #${input.accountId} not found`);
  }

  const amount = toAmount(input.amount);
  if (amount <= 0) return null;

  const currentBal = toAmount(account.currentBalance);
  const balanceBefore = currentBal;
  const balanceAfter =
    input.type === "DEBIT" ? currentBal + amount : currentBal - amount;

  // 1. Update account balance
  await tx.orm.public.FinancialAccount.where({ id: account.id }).update({
    currentBalance: String(balanceAfter),
  });

  const txDate = toInstant(input.transactionDate);

  // 2. Insert transaction log
  const txRecord = await tx.orm.public.AccountTransaction.create({
    accountId: account.id,
    type: input.type,
    amount: String(amount),
    balanceBefore: String(balanceBefore),
    balanceAfter: String(balanceAfter),
    sourceModule: input.sourceModule,
    referenceId: input.referenceId || null,
    description: input.description || null,
    transactionDate: txDate,
    createdById: input.createdById || null,
  });

  const transactionId = `TRX-${String(txRecord.id).padStart(6, "0")}`;
  await tx.orm.public.AccountTransaction.where({ id: txRecord.id }).update({
    transactionId,
  });

  return {
    ...txRecord,
    transactionId,
    balanceAfter,
  };
};

// ----------------------------------------------------------------------------------
// 3. Fund Transfer & Capital Injection
// ----------------------------------------------------------------------------------

export const transferFunds = async (input: TransferFundsInput, userId?: number) => {
  return await db.transaction(async (tx) => {
    const fromAcc = await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance")
      .first({ id: input.fromAccountId });
    const toAcc = await tx.orm.public.FinancialAccount.select("id", "accountName", "currentBalance")
      .first({ id: input.toAccountId });

    if (!fromAcc || !toAcc) {
      throw new Error("One or both accounts not found");
    }

    const transferDate = toInstant(input.transferDate);
    const amount = toAmount(input.amount);

    // 1. Credit from source account (Cash out)
    const outTrx = await recordTransaction(tx, {
      accountId: fromAcc.id,
      type: "CREDIT",
      amount,
      sourceModule: "FUND_TRANSFER",
      referenceId: `TRF-${toAcc.id}`,
      description: `Transfer to ${toAcc.accountName}${input.notes ? ` (${input.notes})` : ""}`,
      transactionDate: transferDate,
      createdById: userId,
    });

    // 2. Debit to destination account (Cash in)
    const inTrx = await recordTransaction(tx, {
      accountId: toAcc.id,
      type: "DEBIT",
      amount,
      sourceModule: "FUND_TRANSFER",
      referenceId: `TRF-${fromAcc.id}`,
      description: `Transfer from ${fromAcc.accountName}${input.notes ? ` (${input.notes})` : ""}`,
      transactionDate: transferDate,
      createdById: userId,
    });

    return {
      success: true,
      fromAccount: fromAcc.accountName,
      toAccount: toAcc.accountName,
      amount,
      outTransactionId: outTrx?.transactionId,
      inTransactionId: inTrx?.transactionId,
    };
  });
};

export const injectCapital = async (input: InjectCapitalInput, userId?: number) => {
  return await db.transaction(async (tx) => {
    const account = await tx.orm.public.FinancialAccount.select("id", "accountName")
      .first({ id: input.accountId });

    if (!account) {
      throw new Error("Account not found");
    }

    const amount = toAmount(input.amount);
    const depositDate = toInstant(input.depositDate);

    const trx = await recordTransaction(tx, {
      accountId: account.id,
      type: "DEBIT",
      amount,
      sourceModule: "CAPITAL_INJECTION",
      referenceId: input.source || "HEAD_OFFICE",
      description: `Capital fund deposit${input.source ? ` from ${input.source}` : ""}${input.notes ? ` (${input.notes})` : ""}`,
      transactionDate: depositDate,
      createdById: userId,
    });

    return {
      success: true,
      accountName: account.accountName,
      amount,
      transactionId: trx?.transactionId,
    };
  });
};

// ----------------------------------------------------------------------------------
// 4. Ledger Statements & Reporting
// ----------------------------------------------------------------------------------

export const listTransactions = async (query: ListTransactionsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const offset = pageOffset(page, limit);

  let txQuery = db.orm.public.AccountTransaction.select(
    "id",
    "transactionId",
    "accountId",
    "type",
    "amount",
    "balanceBefore",
    "balanceAfter",
    "sourceModule",
    "referenceId",
    "description",
    "transactionDate",
    "createdAt",
  ).include("account", (acc) =>
    acc.select("id", "accountName", "accountType"),
  );

  if (query.accountId) {
    txQuery = txQuery.where({ accountId: query.accountId });
  }

  if (query.type) {
    txQuery = txQuery.where({ type: query.type as any });
  }

  if (query.sourceModule) {
    txQuery = txQuery.where({ sourceModule: query.sourceModule as any });
  }

  if (query.fromDate) {
    const start = toInstant(`${query.fromDate}T00:00:00Z`);
    txQuery = txQuery.where((t: any) => t.transactionDate.gte(start));
  }

  if (query.toDate) {
    const end = toInstant(`${query.toDate}T23:59:59.999Z`);
    txQuery = txQuery.where((t: any) => t.transactionDate.lte(end));
  }

  const [{ total }, transactions] = await Promise.all([
    txQuery.aggregate((agg) => ({ total: agg.count() })),
    txQuery
      .orderBy([
        (t: any) => t.transactionDate.desc(),
        (t: any) => t.createdAt.desc(),
        (t: any) => t.id.desc(),
      ])
      .offset(offset)
      .limit(limit)
      .all(),
  ]);

  return {
    transactions,
    meta: paginationMeta(page, limit, total),
  };
};

export const getDailyCashSheet = async (query: DailyCashSheetQuery) => {
  const dateStr =
    query.date ||
    Temporal.Now.zonedDateTimeISO("Asia/Dhaka").toPlainDate().toString();
  const plainDate = Temporal.PlainDate.from(dateStr);
  const startOfDay = Temporal.ZonedDateTime.from({
    timeZone: "Asia/Dhaka",
    year: plainDate.year,
    month: plainDate.month,
    day: plainDate.day,
    hour: 0,
    minute: 0,
    second: 0,
  }).toInstant();

  const endOfDay = startOfDay
    .toZonedDateTimeISO("Asia/Dhaka")
    .add({ days: 1 })
    .toInstant();

  // Target account or default cash account
  let targetAccount = null;
  if (query.accountId) {
    targetAccount = await getAccountById(query.accountId);
  } else {
    targetAccount = await getDefaultAccount();
  }

  if (!targetAccount) {
    throw new Error("No cash account found");
  }

  // 1. Transactions before today (to calculate opening balance)
  const priorTransactions = await db.orm.public.AccountTransaction.select(
    "type",
    "amount",
  )
    .where({ accountId: targetAccount.id })
    .where((t: any) => t.transactionDate.lt(startOfDay))
    .all();

  const openingBalance = priorTransactions.reduce((bal, t) => {
    const amt = toAmount(t.amount);
    return t.type === "DEBIT" ? bal + amt : bal - amt;
  }, 0);

  // 2. Transactions for today
  const todayTransactions = await db.orm.public.AccountTransaction.select(
    "id",
    "transactionId",
    "type",
    "amount",
    "balanceBefore",
    "balanceAfter",
    "sourceModule",
    "referenceId",
    "description",
    "transactionDate",
  )
    .where({ accountId: targetAccount.id })
    .where((t: any) => t.transactionDate.gte(startOfDay))
    .where((t: any) => t.transactionDate.lt(endOfDay))
    .orderBy((t) => t.transactionDate.asc())
    .all();

  // Breakdown categorization
  const cashIn = {
    loanCollection: 0,
    generalSavingsDeposit: 0,
    specialSavingsDeposit: 0,
    dpsDeposit: 0,
    admissionFee: 0,
    capitalReceived: 0,
    otherIncome: 0,
    transfersIn: 0,
    total: 0,
  };

  const cashOut = {
    loanDisbursement: 0,
    savingsWithdrawal: 0,
    dpsWithdrawal: 0,
    officeExpense: 0,
    transfersOut: 0,
    total: 0,
  };

  for (const t of todayTransactions) {
    const amt = toAmount(t.amount);
    if (t.type === "DEBIT") {
      cashIn.total += amt;
      switch (t.sourceModule) {
        case "LOAN_COLLECTION":
          cashIn.loanCollection += amt;
          break;
        case "SAVINGS_DEPOSIT":
          cashIn.generalSavingsDeposit += amt;
          break;
        case "DPS_DEPOSIT":
          cashIn.dpsDeposit += amt;
          break;
        case "MEMBER_ADMISSION":
          cashIn.admissionFee += amt;
          break;
        case "CAPITAL_INJECTION":
          cashIn.capitalReceived += amt;
          break;
        case "OTHER_INCOME":
          cashIn.otherIncome += amt;
          break;
        case "FUND_TRANSFER":
          cashIn.transfersIn += amt;
          break;
        default:
          cashIn.otherIncome += amt;
      }
    } else {
      cashOut.total += amt;
      switch (t.sourceModule) {
        case "LOAN_DISBURSEMENT":
          cashOut.loanDisbursement += amt;
          break;
        case "SAVINGS_WITHDRAWAL":
          cashOut.savingsWithdrawal += amt;
          break;
        case "DPS_WITHDRAWAL":
          cashOut.dpsWithdrawal += amt;
          break;
        case "OFFICE_EXPENSE":
          cashOut.officeExpense += amt;
          break;
        case "FUND_TRANSFER":
          cashOut.transfersOut += amt;
          break;
        default:
          cashOut.officeExpense += amt;
      }
    }
  }

  const closingBalance = openingBalance + cashIn.total - cashOut.total;

  return {
    date: dateStr,
    account: {
      id: targetAccount.id,
      accountName: targetAccount.accountName,
      accountType: targetAccount.accountType,
    },
    openingBalance,
    cashIn,
    cashOut,
    closingBalance,
    transactions: todayTransactions,
  };
};

export const getProfitLossStatement = async (query: ProfitLossQuery) => {
  const fromDateStr =
    query.fromDate ||
    Temporal.Now.zonedDateTimeISO("Asia/Dhaka")
      .toPlainDate()
      .with({ day: 1 })
      .toString();
  const toDateStr =
    query.toDate ||
    Temporal.Now.zonedDateTimeISO("Asia/Dhaka").toPlainDate().toString();

  const fromPlain = Temporal.PlainDate.from(fromDateStr);
  const toPlain = Temporal.PlainDate.from(toDateStr);

  const start = Temporal.ZonedDateTime.from({
    timeZone: "Asia/Dhaka",
    year: fromPlain.year,
    month: fromPlain.month,
    day: fromPlain.day,
    hour: 0,
    minute: 0,
    second: 0,
  }).toInstant();

  const end = Temporal.ZonedDateTime.from({
    timeZone: "Asia/Dhaka",
    year: toPlain.year,
    month: toPlain.month,
    day: toPlain.day,
    hour: 23,
    minute: 59,
    second: 59,
  }).toInstant();

  // 1. Loan interest / service charges collected in this period
  const loanPayments = await db.orm.public.LoanPayment.select(
    "amount",
    "loanId",
  ).include("loan", (l) =>
    l.select("principalAmount", "chargeAmount", "totalPayable"),
  )
    .where((p: any) => p.paymentDate.gte(start))
    .where((p: any) => p.paymentDate.lte(end))
    .all();

  let loanServiceChargeIncome = 0;
  for (const p of loanPayments) {
    const amt = toAmount(p.amount);
    const charge = toAmount(p.loan?.chargeAmount);
    const totalPayable = toAmount(p.loan?.totalPayable);
    if (totalPayable > 0 && charge > 0) {
      const interestPortion = amt * (charge / totalPayable);
      loanServiceChargeIncome += interestPortion;
    }
  }

  // 2. Member admission fees in this period
  const admissionTransactions = await db.orm.public.AccountTransaction.select("amount")
    .where({ sourceModule: "MEMBER_ADMISSION", type: "DEBIT" })
    .where((t: any) => t.transactionDate.gte(start))
    .where((t: any) => t.transactionDate.lte(end))
    .all();

  const admissionFeeIncome = admissionTransactions.reduce((sum, t) => sum + toAmount(t.amount), 0);

  // 3. Other manual incomes recorded in IncomeExpense
  const otherIncomes = await db.orm.public.IncomeExpense.select(
    "amount",
    "categoryId",
  ).include("category", (c) => c.select("name"))
    .where({ type: "INCOME" })
    .where((ie: any) => ie.date.gte(start))
    .where((ie: any) => ie.date.lte(end))
    .all();

  const otherIncomeByCategory: Record<string, number> = {};
  let totalOtherIncome = 0;
  for (const inc of otherIncomes) {
    const catName = inc.category?.name || "General Income";
    const amt = toAmount(inc.amount);
    otherIncomeByCategory[catName] = (otherIncomeByCategory[catName] || 0) + amt;
    totalOtherIncome += amt;
  }

  const totalRevenue = loanServiceChargeIncome + admissionFeeIncome + totalOtherIncome;

  // 4. Operating Expenses
  const expenses = await db.orm.public.IncomeExpense.select(
    "amount",
    "categoryId",
  ).include("category", (c) => c.select("name"))
    .where({ type: "EXPENSE" })
    .where((ie: any) => ie.date.gte(start))
    .where((ie: any) => ie.date.lte(end))
    .all();

  const expensesByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  for (const exp of expenses) {
    const catName = exp.category?.name || "General Expense";
    const amt = toAmount(exp.amount);
    expensesByCategory[catName] = (expensesByCategory[catName] || 0) + amt;
    totalExpenses += amt;
  }

  const netSurplus = totalRevenue - totalExpenses;

  return {
    period: {
      fromDate: fromDateStr,
      toDate: toDateStr,
    },
    revenue: {
      loanServiceCharge: Math.round(loanServiceChargeIncome * 100) / 100,
      admissionFee: admissionFeeIncome,
      otherIncomes: otherIncomeByCategory,
      totalOtherIncome,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    },
    expenses: {
      byCategory: expensesByCategory,
      totalExpenses,
    },
    netSurplus: Math.round(netSurplus * 100) / 100,
    isProfitable: netSurplus >= 0,
  };
};
