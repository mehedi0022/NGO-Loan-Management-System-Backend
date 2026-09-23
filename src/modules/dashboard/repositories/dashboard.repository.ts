import type { Temporal } from "temporal-polyfill";

import { db } from "../../../prisma/db.js";
import {
  getOperationalTrendRange,
  getStoredBusinessDateRange,
} from "../utils/operational-date.util.js";

const ZERO = "0";

const installmentAggregateSpec = {
  count: "pg/int4@1",
  amount: "pg/numeric@1",
  paidAmount: "pg/numeric@1",
} as const;

const loanFinancialAggregateSpec = {
  totalPrincipal: "pg/numeric@1",
  totalPayable: "pg/numeric@1",
} as const;

const findLoanFinancialAggregates = async () => {
  const plan = db.raw.sql`
    SELECT
      COALESCE(SUM("principalAmount"), 0) AS "totalPrincipal",
      COALESCE(SUM("totalPayable"), 0) AS "totalPayable"
    FROM "public"."loan"
    WHERE "status" IN ('ACTIVE', 'COMPLETED')
  `.returnsRow(loanFinancialAggregateSpec).build();

  const rows = await db.runtime().query(plan);

  return rows[0] ?? { totalPrincipal: ZERO, totalPayable: ZERO };
};

const findInstallmentAggregates = async (date: Temporal.PlainDate) => {
  const { start, end } = getStoredBusinessDateRange(date);

  const outstandingPlan = db.raw.sql`
    SELECT
      COUNT(*)::int4 AS "count",
      COALESCE(SUM(i."amount"), 0) AS "amount",
      COALESCE(SUM(i."paidAmount"), 0) AS "paidAmount"
    FROM "public"."loanInstallment" i
    INNER JOIN "public"."loan" l ON l."id" = i."loanId"
    WHERE l."status" = 'ACTIVE'
      AND i."status" IN ('PENDING', 'PARTIAL')
  `.returnsRow(installmentAggregateSpec).build();

  const dueTodayPlan = db.raw.sql`
    SELECT
      COUNT(*)::int4 AS "count",
      COALESCE(SUM(i."amount"), 0) AS "amount",
      COALESCE(SUM(i."paidAmount"), 0) AS "paidAmount"
    FROM "public"."loanInstallment" i
    INNER JOIN "public"."loan" l ON l."id" = i."loanId"
    WHERE l."status" = 'ACTIVE'
      AND i."status" IN ('PENDING', 'PARTIAL')
      AND i."dueDate" >= ${start.toString()}::timestamptz
      AND i."dueDate" < ${end.toString()}::timestamptz
  `.returnsRow(installmentAggregateSpec).build();

  const overduePlan = db.raw.sql`
    SELECT
      COUNT(*)::int4 AS "count",
      COALESCE(SUM(i."amount"), 0) AS "amount",
      COALESCE(SUM(i."paidAmount"), 0) AS "paidAmount"
    FROM "public"."loanInstallment" i
    INNER JOIN "public"."loan" l ON l."id" = i."loanId"
    WHERE l."status" = 'ACTIVE'
      AND i."status" IN ('PENDING', 'PARTIAL')
      AND i."dueDate" < ${start.toString()}::timestamptz
  `.returnsRow(installmentAggregateSpec).build();

  const [outstandingRows, dueTodayRows, overdueRows] = await Promise.all([
    db.runtime().query(outstandingPlan),
    db.runtime().query(dueTodayPlan),
    db.runtime().query(overduePlan),
  ]);

  return {
    outstanding: outstandingRows[0] ?? { count: 0, amount: ZERO, paidAmount: ZERO },
    dueToday: dueTodayRows[0] ?? { count: 0, amount: ZERO, paidAmount: ZERO },
    overdue: overdueRows[0] ?? { count: 0, amount: ZERO, paidAmount: ZERO },
  };
};

/**
 * Fetch all non-trend dashboard aggregates without materialising financial
 * rows in application memory. Active loan IDs are the only scalar list used,
 * allowing installment aggregates to stay inside PostgreSQL.
 */
export const findDashboardAggregates = async (date: Temporal.PlainDate) => {
  const { start, end } = getStoredBusinessDateRange(date);

  const [
    memberTotals,
    loanPortfolioRows,
    savingsTotals,
    todayCollections,
    todayWithdrawals,
  ] = await Promise.all([
    db.orm.public.Member.aggregate((aggregate) => ({
      totalMembers: aggregate.count(),
    })),
    db.orm.public.Loan.groupBy("status").aggregate((aggregate) => ({
      count: aggregate.count(),
    })),
    db.orm.public.SavingsAccount.aggregate((aggregate) => ({
      generalBalance: aggregate.sum("generalSavingsBalance"),
      specialBalance: aggregate.sum("specialSavingsBalance"),
    })),
    db.orm.public.Collection.where((collection) =>
      collection.collectionDate.gte(start),
    )
      .where((collection) => collection.collectionDate.lt(end))
      .aggregate((aggregate) => ({
        totalCollected: aggregate.sum("totalAmount"),
        loanCollected: aggregate.sum("loanCollectionAmount"),
        generalSavingsCollected: aggregate.sum("generalSavingsAmount"),
        specialSavingsCollected: aggregate.sum("specialSavingsAmount"),
      })),
    db.orm.public.SavingsTransaction.where({ type: "WITHDRAWAL" })
      .where((transaction) => transaction.transactionDate.gte(start))
      .where((transaction) => transaction.transactionDate.lt(end))
      .aggregate((aggregate) => ({
        savingsWithdrawn: aggregate.sum("amount"),
      })),
  ]);

  const [installments, loanFinancials] = await Promise.all([
    findInstallmentAggregates(date),
    findLoanFinancialAggregates(),
  ]);

  const loanPortfolio = Object.fromEntries(
    loanPortfolioRows.map((row) => [row.status, row.count]),
  ) as Partial<Record<(typeof loanPortfolioRows)[number]["status"], number>>;

  return {
    totalMembers: memberTotals.totalMembers,
    activeLoans: loanPortfolio.ACTIVE ?? 0,
    loanPortfolio,
    savings: {
      generalBalance: savingsTotals.generalBalance ?? ZERO,
      specialBalance: savingsTotals.specialBalance ?? ZERO,
    },
    todayCollections: {
      totalCollected: todayCollections.totalCollected ?? ZERO,
      loanCollected: todayCollections.loanCollected ?? ZERO,
      generalSavingsCollected:
        todayCollections.generalSavingsCollected ?? ZERO,
      specialSavingsCollected:
        todayCollections.specialSavingsCollected ?? ZERO,
    },
    savingsWithdrawn: todayWithdrawals.savingsWithdrawn ?? ZERO,
    installments,
    loanFinancials,
  };
};

export type CollectionTrendPoint = {
  date: string;
  loanCollected: string;
  savingsCollected: string;
  totalCollected: string;
};

/**
 * Aggregate unified collections into a complete operational-day series.
 * generate_series ensures days without collections are returned as zeroes.
 */
export const findCollectionTrend = async (
  date: Temporal.PlainDate,
  trendDays: 7 | 30,
): Promise<CollectionTrendPoint[]> => {
  const { startDate, endDate } = getOperationalTrendRange(date, trendDays);

  const plan = db.raw.sql`
    WITH days AS (
      SELECT generate_series(
        ${startDate.toString()}::date,
        ${endDate.toString()}::date,
        interval '1 day'
      )::date AS day
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS "date",
      COALESCE(SUM(c."loanCollectionAmount"), 0) AS "loanCollected",
      COALESCE(
        SUM(c."generalSavingsAmount" + c."specialSavingsAmount"),
        0
      ) AS "savingsCollected",
      COALESCE(SUM(c."totalAmount"), 0) AS "totalCollected"
    FROM days
    LEFT JOIN "public"."collection" c
      ON c."collectionDate" >= days.day::timestamptz
      AND c."collectionDate" < (days.day + interval '1 day')::timestamptz
    GROUP BY days.day
    ORDER BY days.day ASC
  `
    .returnsRow({
      date: "pg/text@1",
      loanCollected: "pg/numeric@1",
      savingsCollected: "pg/numeric@1",
      totalCollected: "pg/numeric@1",
    })
    .build();

  return db.runtime().query(plan);
};
