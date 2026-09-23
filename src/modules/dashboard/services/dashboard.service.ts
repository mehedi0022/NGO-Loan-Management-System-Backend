import type { DashboardSummaryQuery } from "../dashboard.types.js";
import * as repository from "../repositories/dashboard.repository.js";
import {
  addMoney,
  normalizeMoney,
  remainingMoney,
} from "../utils/dashboard-money.util.js";
import { resolveOperationalDate } from "../utils/operational-date.util.js";

export const getDashboardSummary = async (query: DashboardSummaryQuery) => {
  const operationalDate = resolveOperationalDate(query.date);
  const [aggregates, collectionTrend] = await Promise.all([
    repository.findDashboardAggregates(operationalDate),
    repository.findCollectionTrend(operationalDate, query.trendDays),
  ]);

  const outstandingLoanAmount = remainingMoney(
    aggregates.installments.outstanding.amount,
    aggregates.installments.outstanding.paidAmount,
  );
  const totalPrincipal = normalizeMoney(
    aggregates.loanFinancials.totalPrincipal,
  );
  const totalPayable = normalizeMoney(
    aggregates.loanFinancials.totalPayable,
  );
  const totalCharge = remainingMoney(totalPayable, totalPrincipal);
  const totalLoanCollected = remainingMoney(
    totalPayable,
    outstandingLoanAmount,
  );
  const amountDue = remainingMoney(
    aggregates.installments.dueToday.amount,
    aggregates.installments.dueToday.paidAmount,
  );
  const overdueAmount = remainingMoney(
    aggregates.installments.overdue.amount,
    aggregates.installments.overdue.paidAmount,
  );
  const totalSavings = addMoney(
    aggregates.savings.generalBalance,
    aggregates.savings.specialBalance,
  );
  const savingsCollected = addMoney(
    aggregates.todayCollections.generalSavingsCollected,
    aggregates.todayCollections.specialSavingsCollected,
  );

  return {
    operationalDate: operationalDate.toString(),
    trendDays: query.trendDays,
    overview: {
      totalMembers: aggregates.totalMembers,
      activeLoans: aggregates.activeLoans,
      totalPrincipal,
      totalCharge,
      totalPayable,
      totalLoanCollected,
      outstandingLoanAmount,
      totalSavings,
    },
    today: {
      installmentsDue: aggregates.installments.dueToday.count,
      amountDue,
      totalCollected: normalizeMoney(
        aggregates.todayCollections.totalCollected,
      ),
      loanCollected: normalizeMoney(
        aggregates.todayCollections.loanCollected,
      ),
      generalSavingsCollected: normalizeMoney(
        aggregates.todayCollections.generalSavingsCollected,
      ),
      specialSavingsCollected: normalizeMoney(
        aggregates.todayCollections.specialSavingsCollected,
      ),
      savingsCollected,
      savingsWithdrawn: normalizeMoney(aggregates.savingsWithdrawn),
    },
    attention: {
      overdueInstallments: aggregates.installments.overdue.count,
      overdueAmount,
      pendingLoans: aggregates.loanPortfolio.PENDING ?? 0,
      approvedLoans: aggregates.loanPortfolio.APPROVED ?? 0,
    },
    savings: {
      generalBalance: normalizeMoney(aggregates.savings.generalBalance),
      specialBalance: normalizeMoney(aggregates.savings.specialBalance),
      totalBalance: totalSavings,
    },
    loanPortfolio: {
      pending: aggregates.loanPortfolio.PENDING ?? 0,
      approved: aggregates.loanPortfolio.APPROVED ?? 0,
      active: aggregates.loanPortfolio.ACTIVE ?? 0,
      completed: aggregates.loanPortfolio.COMPLETED ?? 0,
      rejected: aggregates.loanPortfolio.REJECTED ?? 0,
      cancelled: aggregates.loanPortfolio.CANCELLED ?? 0,
    },
    collectionTrend: collectionTrend.map((point) => ({
      date: point.date,
      loanCollected: normalizeMoney(point.loanCollected),
      savingsCollected: normalizeMoney(point.savingsCollected),
      totalCollected: normalizeMoney(point.totalCollected),
    })),
  };
};
