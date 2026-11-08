import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  DayClosingPreview,
  DayClosingRecord,
  ExecuteDayClosingInput,
  ListDayClosingsQuery,
} from "../day-closing.types.js";

const toAmount = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const getDhakaTodayDateStr = (): string => {
  return Temporal.Now.zonedDateTimeISO("Asia/Dhaka").toPlainDate().toString();
};

const dateStrToInstantRange = (dateStr: string) => {
  const plainDate = Temporal.PlainDate.from(dateStr);
  const start = Temporal.ZonedDateTime.from({
    timeZone: "Asia/Dhaka",
    year: plainDate.year,
    month: plainDate.month,
    day: plainDate.day,
    hour: 0,
    minute: 0,
    second: 0,
  }).toInstant();

  const end = start
    .toZonedDateTimeISO("Asia/Dhaka")
    .add({ days: 1 })
    .toInstant();

  return { start, end };
};

/**
 * 1. Find the current active (OPEN) business day.
 * If no business day exists in DB, initialize the first OPEN day with today's date.
 */
export const getActiveBusinessDay = async (): Promise<DayClosingRecord> => {
  const active = await db.orm.public.DayClosing.select(
    "id",
    "businessDate",
    "status",
    "openingBalance",
    "totalCashIn",
    "totalCashOut",
    "closingBalance",
    "loanCollection",
    "savingsDeposit",
    "dpsDeposit",
    "admissionFee",
    "capitalReceived",
    "otherIncome",
    "loanDisbursed",
    "savingsWithdrawn",
    "dpsWithdrawn",
    "officeExpense",
    "isHoliday",
    "notes",
    "openedAt",
    "closedAt",
    "closedById",
  )
    .where({ status: "OPEN" })
    .orderBy((d) => d.businessDate.desc())
    .first();

  if (active) {
    return formatDayRecord(active);
  }

  // No active day found - check if there are any closed days
  const lastClosed = await db.orm.public.DayClosing.select(
    "businessDate",
    "closingBalance",
  )
    .where({ status: "CLOSED" })
    .orderBy((d) => d.businessDate.desc())
    .first();

  let initialOpeningBalance = 0;
  let targetDateStr = getDhakaTodayDateStr();

  if (lastClosed) {
    initialOpeningBalance = toAmount(lastClosed.closingBalance);
    // Suggest the next calendar day after last closed
    const lastDate = Temporal.Instant.from(lastClosed.businessDate.toISOString())
      .toZonedDateTimeISO("Asia/Dhaka")
      .toPlainDate();
    const nextDate = lastDate.add({ days: 1 });
    targetDateStr = nextDate.toString();
  } else {
    // Brand new system: compute initial sum of default cash account transactions
    const defaultAccount = await db.orm.public.FinancialAccount.select("id")
      .where({ isDefault: true })
      .first();

    if (defaultAccount) {
      const priorTransactions = await db.orm.public.AccountTransaction.select(
        "type",
        "amount",
      ).where({ accountId: defaultAccount.id }).all();

      initialOpeningBalance = priorTransactions.reduce((bal, t) => {
        const amt = toAmount(t.amount);
        return t.type === "DEBIT" ? bal + amt : bal - amt;
      }, 0);
    }
  }

  const { start: businessInstant } = dateStrToInstantRange(targetDateStr);

  const newDay = await db.orm.public.DayClosing.create({
    businessDate: businessInstant,
    status: "OPEN",
    openingBalance: initialOpeningBalance.toString(),
    totalCashIn: "0",
    totalCashOut: "0",
    closingBalance: initialOpeningBalance.toString(),
    isHoliday: false,
  });

  return formatDayRecord(newDay);
};

/**
 * 2. Get Day Closing preview for the current active business day
 */
export const getDayClosingPreview = async (): Promise<DayClosingPreview> => {
  const activeDay = await getActiveBusinessDay();
  const dateStr = activeDay.businessDate;
  const calendarToday = getDhakaTodayDateStr();
  const isDeferred = dateStr < calendarToday;

  const { start, end } = dateStrToInstantRange(dateStr);

  // Read transactions that occurred during this business date range
  const transactions = await db.orm.public.AccountTransaction.select(
    "id",
    "type",
    "amount",
    "sourceModule",
    "transactionDate",
  )
    .where((t: any) => t.transactionDate.gte(start))
    .where((t: any) => t.transactionDate.lt(end))
    .all();

  const cashIn = {
    loanCollection: 0,
    savingsDeposit: 0,
    dpsDeposit: 0,
    admissionFee: 0,
    capitalReceived: 0,
    otherIncome: 0,
    total: 0,
  };

  const cashOut = {
    loanDisbursed: 0,
    savingsWithdrawn: 0,
    dpsWithdrawn: 0,
    officeExpense: 0,
    total: 0,
  };

  for (const t of transactions) {
    const amt = toAmount(t.amount);
    if (t.type === "DEBIT") {
      cashIn.total += amt;
      switch (t.sourceModule) {
        case "LOAN_COLLECTION":
          cashIn.loanCollection += amt;
          break;
        case "SAVINGS_DEPOSIT":
          cashIn.savingsDeposit += amt;
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
        default:
          cashIn.otherIncome += amt;
      }
    } else {
      cashOut.total += amt;
      switch (t.sourceModule) {
        case "LOAN_DISBURSEMENT":
          cashOut.loanDisbursed += amt;
          break;
        case "SAVINGS_WITHDRAWAL":
          cashOut.savingsWithdrawn += amt;
          break;
        case "DPS_WITHDRAWAL":
          cashOut.dpsWithdrawn += amt;
          break;
        case "OFFICE_EXPENSE":
          cashOut.officeExpense += amt;
          break;
        default:
          cashOut.officeExpense += amt;
      }
    }
  }

  const closingBalance = activeDay.openingBalance + cashIn.total - cashOut.total;

  // Calculate suggested next business date (businessDate + 1 day)
  const currentPlain = Temporal.PlainDate.from(dateStr);
  const nextPlain = currentPlain.add({ days: 1 });

  return {
    businessDate: dateStr,
    status: "OPEN",
    isDeferred,
    calendarDate: calendarToday,
    openingBalance: activeDay.openingBalance,
    cashIn,
    cashOut,
    closingBalance: Math.round(closingBalance * 100) / 100,
    totalTransactionsCount: transactions.length,
    suggestedNextDate: nextPlain.toString(),
  };
};

/**
 * 3. Execute Day Closing: Close the active day and open the next business day
 */
export const executeDayClosing = async (
  userId: number,
  input: ExecuteDayClosingInput,
): Promise<{ closedDay: DayClosingRecord; nextDay: DayClosingRecord }> => {
  const activeDay = await getActiveBusinessDay();
  const preview = await getDayClosingPreview();

  const nowInstant = Temporal.Now.instant();

  // Determine next business date
  let nextDateStr = input.nextBusinessDate;
  if (!nextDateStr) {
    const currentPlain = Temporal.PlainDate.from(activeDay.businessDate);
    nextDateStr = currentPlain.add({ days: 1 }).toString();
  }

  // 1. Update active day to CLOSED
  const closedRow = await db.orm.public.DayClosing.where({ id: activeDay.id })
    .update({
      status: "CLOSED",
      totalCashIn: preview.cashIn.total.toString(),
      totalCashOut: preview.cashOut.total.toString(),
      closingBalance: preview.closingBalance.toString(),
      loanCollection: preview.cashIn.loanCollection.toString(),
      savingsDeposit: preview.cashIn.savingsDeposit.toString(),
      dpsDeposit: preview.cashIn.dpsDeposit.toString(),
      admissionFee: preview.cashIn.admissionFee.toString(),
      capitalReceived: preview.cashIn.capitalReceived.toString(),
      otherIncome: preview.cashIn.otherIncome.toString(),
      loanDisbursed: preview.cashOut.loanDisbursed.toString(),
      savingsWithdrawn: preview.cashOut.savingsWithdrawn.toString(),
      dpsWithdrawn: preview.cashOut.dpsWithdrawn.toString(),
      officeExpense: preview.cashOut.officeExpense.toString(),
      notes: input.notes || null,
      closedAt: nowInstant,
      closedById: userId,
    });

  // 2. Open the next business day with openingBalance = previous closingBalance
  const { start: nextInstant } = dateStrToInstantRange(nextDateStr);

  const nextRow = await db.orm.public.DayClosing.create({
    businessDate: nextInstant,
    status: "OPEN",
    openingBalance: preview.closingBalance.toString(),
    totalCashIn: "0",
    totalCashOut: "0",
    closingBalance: preview.closingBalance.toString(),
    isHoliday: Boolean(input.isNextDayHoliday),
    openedAt: nowInstant,
  });

  return {
    closedDay: formatDayRecord(closedRow),
    nextDay: formatDayRecord(nextRow),
  };
};

/**
 * 4. List historical day closings
 */
export const listDayClosings = async (query: ListDayClosingsQuery) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = pageOffset(page, limit);

  let q = db.orm.public.DayClosing.select(
    "id",
    "businessDate",
    "status",
    "openingBalance",
    "totalCashIn",
    "totalCashOut",
    "closingBalance",
    "loanCollection",
    "savingsDeposit",
    "dpsDeposit",
    "admissionFee",
    "capitalReceived",
    "otherIncome",
    "loanDisbursed",
    "savingsWithdrawn",
    "dpsWithdrawn",
    "officeExpense",
    "isHoliday",
    "notes",
    "openedAt",
    "closedAt",
    "closedById",
  ).include("closedBy", (u) => u.select("id", "fullName", "userName"));

  if (query.status) {
    q = q.where({ status: query.status });
  }

  if (query.fromDate) {
    const { start } = dateStrToInstantRange(query.fromDate);
    q = q.where((d: any) => d.businessDate.gte(start));
  }

  if (query.toDate) {
    const { end } = dateStrToInstantRange(query.toDate);
    q = q.where((d: any) => d.businessDate.lt(end));
  }

  const [totalCount, rows] = await Promise.all([
    q.count(),
    q.orderBy((d) => d.businessDate.desc()).offset(offset).limit(limit).all(),
  ]);

  return {
    closings: rows.map(formatDayRecord),
    meta: paginationMeta(toAmount(totalCount), page, limit),
  };
};

/**
 * 5. Check if a given date is CLOSED
 */
export const isDateClosed = async (dateStr: string): Promise<boolean> => {
  const { start } = dateStrToInstantRange(dateStr);
  const record = await db.orm.public.DayClosing.select("status")
    .where({ businessDate: start })
    .first();

  if (!record) {
    return false; // not closed yet
  }

  return record.status === "CLOSED";
};

// Helper: Format database record to DTO
const formatDayRecord = (row: any): DayClosingRecord => {
  const dateStr = Temporal.Instant.from(
    row.businessDate instanceof Date ? row.businessDate.toISOString() : String(row.businessDate)
  )
    .toZonedDateTimeISO("Asia/Dhaka")
    .toPlainDate()
    .toString();

  return {
    id: row.id,
    businessDate: dateStr,
    status: row.status,
    openingBalance: toAmount(row.openingBalance),
    totalCashIn: toAmount(row.totalCashIn),
    totalCashOut: toAmount(row.totalCashOut),
    closingBalance: toAmount(row.closingBalance),
    loanCollection: toAmount(row.loanCollection),
    savingsDeposit: toAmount(row.savingsDeposit),
    dpsDeposit: toAmount(row.dpsDeposit),
    admissionFee: toAmount(row.admissionFee),
    capitalReceived: toAmount(row.capitalReceived),
    otherIncome: toAmount(row.otherIncome),
    loanDisbursed: toAmount(row.loanDisbursed),
    savingsWithdrawn: toAmount(row.savingsWithdrawn),
    dpsWithdrawn: toAmount(row.dpsWithdrawn),
    officeExpense: toAmount(row.officeExpense),
    isHoliday: Boolean(row.isHoliday),
    notes: row.notes,
    openedAt: row.openedAt instanceof Date ? row.openedAt.toISOString() : String(row.openedAt),
    closedAt: row.closedAt ? (row.closedAt instanceof Date ? row.closedAt.toISOString() : String(row.closedAt)) : null,
    closedById: row.closedById,
    closedBy: row.closedBy
      ? {
          id: row.closedBy.id,
          fullName: row.closedBy.fullName,
          userName: row.closedBy.userName,
        }
      : null,
  };
};
