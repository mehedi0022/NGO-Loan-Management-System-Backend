import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type {
  DailyCollectionReportQuery,
  LoanPortfolioReportQuery,
  OverdueReportQuery,
  SavingsSummaryReportQuery,
  DpsSummaryReportQuery,
} from "../reports.types.js";

const toInstant = (date: Date) => Temporal.Instant.from(date.toISOString());

const toNumber = (val: unknown): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

/**
 * 1. Daily Collection Report
 */
export const getDailyCollectionsReport = async (query: DailyCollectionReportQuery) => {
  const {
    startDate,
    endDate,
    somitiId,
    fieldOfficerId,
    collectedById,
    paymentMethod,
    page = 1,
    limit = 20,
  } = query;

  // Resolve assigned somiti IDs if fieldOfficerId is provided
  let allowedSomitiIds: number[] | null = null;
  if (fieldOfficerId) {
    const assignedSomities = await db.orm.public.Somiti.select("id")
      .where({ fieldOfficerId })
      .all();
    allowedSomitiIds = assignedSomities.map((s) => s.id);
  }

  let collectionsQuery = db.orm.public.Collection.select(
    "id",
    "collectionId",
    "memberId",
    "loanCollectionAmount",
    "generalSavingsAmount",
    "specialSavingsAmount",
    "dpsAmount",
    "totalAmount",
    "collectionDate",
    "paymentMethod",
    "reference",
    "notes",
    "createdAt",
  )
    .include("member", (member) =>
      member
        .select("id", "memberId", "fullName", "mobileNumber", "somitiId")
        .include("somiti", (somiti) =>
          somiti.select("id", "somitiId", "name", "code", "fieldOfficerId"),
        ),
    )
    .include("collectedBy", (user) =>
      user.select("id", "userName", "fullName"),
    )
    .include("loanPayments", (lp) =>
      lp.select("id", "loanId").include("loan", (loan) => loan.select("id", "loanId")),
    );

  if (collectedById) {
    collectionsQuery = collectionsQuery.where({ collectedById });
  }

  if (paymentMethod) {
    collectionsQuery = collectionsQuery.where({ paymentMethod: paymentMethod as any });
  }

  if (startDate) {
    const from = new Date(`${startDate}T00:00:00.000Z`);
    const fromInstant = toInstant(from);
    collectionsQuery = collectionsQuery.where((c) =>
      c.collectionDate.gte(fromInstant),
    );
  }

  if (endDate) {
    const to = new Date(`${endDate}T23:59:59.999Z`);
    const toInstantVal = toInstant(to);
    collectionsQuery = collectionsQuery.where((c) =>
      c.collectionDate.lte(toInstantVal),
    );
  }

  const allRecords = await collectionsQuery
    .orderBy((c) => c.collectionDate.desc())
    .all();

  // Filter in-memory for somiti scoping if needed
  const filtered = allRecords.filter((record) => {
    const memberSomitiId = record.member?.somitiId;
    if (somitiId && memberSomitiId !== somitiId) {
      return false;
    }
    if (allowedSomitiIds !== null) {
      if (!memberSomitiId || !allowedSomitiIds.includes(memberSomitiId)) {
        return false;
      }
    }
    return true;
  });

  const total = filtered.length;
  const offset = pageOffset(page, limit);
  const pagedRecords = filtered.slice(offset, offset + limit);

  // Compute summary totals
  const totalLoanAmount = filtered.reduce(
    (acc, r) => acc + toNumber(r.loanCollectionAmount),
    0,
  );
  const totalGeneralSavingsAmount = filtered.reduce(
    (acc, r) => acc + toNumber(r.generalSavingsAmount),
    0,
  );
  const totalSpecialSavingsAmount = filtered.reduce(
    (acc, r) => acc + toNumber(r.specialSavingsAmount),
    0,
  );
  const totalDpsAmount = filtered.reduce(
    (acc, r) => acc + toNumber(r.dpsAmount),
    0,
  );
  const totalCollectedAmount = filtered.reduce(
    (acc, r) => acc + toNumber(r.totalAmount),
    0,
  );

  return {
    summary: {
      totalTransactions: total,
      totalLoanAmount,
      totalGeneralSavingsAmount,
      totalSpecialSavingsAmount,
      totalDpsAmount,
      totalCollectedAmount,
    },
    records: pagedRecords.map((r) => ({
      id: r.id,
      receiptNumber: r.collectionId || `REC-${r.id}`,
      collectionDate: r.collectionDate,
      member: {
        id: r.member?.id,
        memberId: r.member?.memberId,
        fullName: r.member?.fullName,
        mobileNumber: r.member?.mobileNumber,
      },
      somiti: r.member?.somiti
        ? {
            id: r.member.somiti.id,
            somitiId: r.member.somiti.somitiId,
            name: r.member.somiti.name,
            code: r.member.somiti.code,
          }
        : null,
      loanId: r.loanPayments?.[0]?.loan?.loanId || null,
      loanCollectionAmount: toNumber(r.loanCollectionAmount),
      generalSavingsAmount: toNumber(r.generalSavingsAmount),
      specialSavingsAmount: toNumber(r.specialSavingsAmount),
      dpsAmount: toNumber(r.dpsAmount),
      totalAmount: toNumber(r.totalAmount),
      paymentMethod: r.paymentMethod,
      reference: r.reference,
      notes: r.notes,
      collectedBy: r.collectedBy
        ? {
            id: r.collectedBy.id,
            userName: r.collectedBy.userName,
            fullName: r.collectedBy.fullName,
          }
        : null,
    })),
    meta: paginationMeta(page, limit, total),
  };
};

/**
 * 2. Loan Portfolio Report
 */
export const getLoanPortfolioReport = async (query: LoanPortfolioReportQuery) => {
  const {
    somitiId,
    fieldOfficerId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query;

  let allowedSomitiIds: number[] | null = null;
  if (fieldOfficerId) {
    const assignedSomities = await db.orm.public.Somiti.select("id")
      .where({ fieldOfficerId })
      .all();
    allowedSomitiIds = assignedSomities.map((s) => s.id);
  }

  let loansQuery = db.orm.public.Loan.select(
    "id",
    "loanId",
    "memberId",
    "principalAmount",
    "chargeType",
    "chargeValue",
    "chargeAmount",
    "totalPayable",
    "installmentCount",
    "installmentAmount",
    "frequency",
    "status",
    "disbursementDate",
    "createdAt",
  )
    .include("member", (member) =>
      member
        .select("id", "memberId", "fullName", "mobileNumber", "somitiId")
        .include("somiti", (somiti) =>
          somiti.select("id", "somitiId", "name", "code", "fieldOfficerId"),
        ),
    )
    .include("payments", (payment) => payment.select("id", "amount"));

  if (status && status !== "ALL") {
    loansQuery = loansQuery.where({ status: status as any });
  }

  if (startDate) {
    const from = new Date(`${startDate}T00:00:00.000Z`);
    const fromInstant = toInstant(from);
    loansQuery = loansQuery.where((l) => l.createdAt.gte(fromInstant));
  }

  if (endDate) {
    const to = new Date(`${endDate}T23:59:59.999Z`);
    const toInstantVal = toInstant(to);
    loansQuery = loansQuery.where((l) => l.createdAt.lte(toInstantVal));
  }

  const allLoans = await loansQuery
    .orderBy((l) => l.createdAt.desc())
    .all();

  const filtered = allLoans.filter((loan) => {
    const memberSomitiId = loan.member?.somitiId;
    if (somitiId && memberSomitiId !== somitiId) {
      return false;
    }
    if (allowedSomitiIds !== null) {
      if (!memberSomitiId || !allowedSomitiIds.includes(memberSomitiId)) {
        return false;
      }
    }
    return true;
  });

  const total = filtered.length;
  const offset = pageOffset(page, limit);
  const pagedLoans = filtered.slice(offset, offset + limit);

  let totalPrincipalDisbursed = 0;
  let totalPayableSum = 0;
  let totalRecoveredSum = 0;

  filtered.forEach((loan) => {
    const principal = toNumber(loan.principalAmount);
    const payable = toNumber(loan.totalPayable);
    const recovered = (loan.payments ?? []).reduce(
      (acc, p) => acc + toNumber(p.amount),
      0,
    );
    totalPrincipalDisbursed += principal;
    totalPayableSum += payable;
    totalRecoveredSum += recovered;
  });

  const totalOutstandingSum = Math.max(0, totalPayableSum - totalRecoveredSum);

  return {
    summary: {
      totalLoans: total,
      totalPrincipalDisbursed,
      totalPayable: totalPayableSum,
      totalRecovered: totalRecoveredSum,
      totalOutstanding: totalOutstandingSum,
    },
    records: pagedLoans.map((loan) => {
      const principal = toNumber(loan.principalAmount);
      const payable = toNumber(loan.totalPayable);
      const paid = (loan.payments ?? []).reduce(
        (acc, p) => acc + toNumber(p.amount),
        0,
      );
      const outstanding = Math.max(0, payable - paid);

      return {
        id: loan.id,
        loanId: loan.loanId || `LN-${loan.id}`,
        member: {
          id: loan.member?.id,
          memberId: loan.member?.memberId,
          fullName: loan.member?.fullName,
          mobileNumber: loan.member?.mobileNumber,
        },
        somiti: loan.member?.somiti
          ? {
              id: loan.member.somiti.id,
              name: loan.member.somiti.name,
              code: loan.member.somiti.code,
            }
          : null,
        principalAmount: principal,
        chargeAmount: toNumber(loan.chargeAmount),
        totalPayable: payable,
        paidAmount: paid,
        outstandingAmount: outstanding,
        installmentCount: loan.installmentCount,
        installmentAmount: toNumber(loan.installmentAmount),
        frequency: loan.frequency,
        status: loan.status,
        disbursementDate: loan.disbursementDate,
        createdAt: loan.createdAt,
      };
    }),
    meta: paginationMeta(page, limit, total),
  };
};

/**
 * 3. Overdue Installments Report
 */
export const getOverdueInstallmentsReport = async (query: OverdueReportQuery) => {
  const {
    asOfDate,
    somitiId,
    fieldOfficerId,
    minDaysOverdue = 0,
    page = 1,
    limit = 20,
  } = query;

  const targetDate = asOfDate ? new Date(`${asOfDate}T23:59:59.999Z`) : new Date();

  let allowedSomitiIds: number[] | null = null;
  if (fieldOfficerId) {
    const assignedSomities = await db.orm.public.Somiti.select("id")
      .where({ fieldOfficerId })
      .all();
    allowedSomitiIds = assignedSomities.map((s) => s.id);
  }

  const installments = await db.orm.public.LoanInstallment.select(
    "id",
    "loanId",
    "installmentNo",
    "dueDate",
    "amount",
    "paidAmount",
    "status",
  )
    .include("loan", (loan) =>
      loan
        .select("id", "loanId", "principalAmount", "totalPayable", "status")
        .include("member", (member) =>
          member
            .select("id", "memberId", "fullName", "mobileNumber", "somitiId")
            .include("somiti", (somiti) =>
              somiti
                .select("id", "somitiId", "name", "code", "fieldOfficerId")
                .include("fieldOfficer", (officer) =>
                  officer.select("id", "fullName", "userName", "email", "role"),
                ),
            ),
        ),
    )
    .where((i) => i.dueDate.lt(toInstant(targetDate)))
    .orderBy((i) => i.dueDate.asc())
    .all();

  const overdueList = installments
    .filter((item) => {
      if (item.loan?.status !== "ACTIVE") return false;
      if (item.status !== "PENDING" && item.status !== "PARTIAL") return false;

      const memberSomitiId = item.loan?.member?.somitiId;
      if (somitiId && memberSomitiId !== somitiId) return false;
      if (allowedSomitiIds !== null) {
        if (!memberSomitiId || !allowedSomitiIds.includes(memberSomitiId)) {
          return false;
        }
      }

      const dueDateTime = new Date(item.dueDate).getTime();
      const diffDays = Math.floor(
        (targetDate.getTime() - dueDateTime) / (1000 * 60 * 60 * 24),
      );

      if (diffDays < minDaysOverdue) return false;

      return true;
    })
    .map((item) => {
      const amount = toNumber(item.amount);
      const paid = toNumber(item.paidAmount);
      const remainingDue = Math.max(0, amount - paid);
      const dueDateTime = new Date(item.dueDate).getTime();
      const daysOverdue = Math.max(
        1,
        Math.floor((targetDate.getTime() - dueDateTime) / (1000 * 60 * 60 * 24)),
      );

      return {
        id: item.id,
        installmentNo: item.installmentNo,
        dueDate: item.dueDate,
        daysOverdue,
        amount,
        paidAmount: paid,
        remainingDue,
        loan: {
          id: item.loan?.id,
          loanId: item.loan?.loanId,
          principalAmount: toNumber(item.loan?.principalAmount),
        },
        member: {
          id: item.loan?.member?.id,
          memberId: item.loan?.member?.memberId,
          fullName: item.loan?.member?.fullName,
          mobileNumber: item.loan?.member?.mobileNumber,
        },
        somiti: item.loan?.member?.somiti
          ? {
              id: item.loan.member.somiti.id,
              name: item.loan.member.somiti.name,
              code: item.loan.member.somiti.code,
              fieldOfficer: item.loan.member.somiti.fieldOfficer,
            }
          : null,
      };
    });

  const total = overdueList.length;
  const offset = pageOffset(page, limit);
  const pagedRecords = overdueList.slice(offset, offset + limit);

  const uniqueMembers = new Set(overdueList.map((i) => i.member?.id)).size;
  const totalOverdueAmount = overdueList.reduce(
    (acc, i) => acc + i.remainingDue,
    0,
  );

  return {
    summary: {
      totalOverdueInstallments: total,
      totalOverdueMembers: uniqueMembers,
      totalOverdueAmount,
    },
    records: pagedRecords,
    meta: paginationMeta(page, limit, total),
  };
};

/**
 * 4. Savings Summary Report
 */
export const getSavingsSummaryReport = async (query: SavingsSummaryReportQuery) => {
  const { somitiId, fieldOfficerId, status, page = 1, limit = 20 } = query;

  let allowedSomitiIds: number[] | null = null;
  if (fieldOfficerId) {
    const assignedSomities = await db.orm.public.Somiti.select("id")
      .where({ fieldOfficerId })
      .all();
    allowedSomitiIds = assignedSomities.map((s) => s.id);
  }

  let accountsQuery = db.orm.public.SavingsAccount.select(
    "id",
    "accountId",
    "memberId",
    "generalSavingsBalance",
    "specialSavingsBalance",
    "status",
    "openedAt",
  )
    .include("member", (member) =>
      member
        .select("id", "memberId", "fullName", "mobileNumber", "somitiId")
        .include("somiti", (somiti) =>
          somiti.select("id", "somitiId", "name", "code", "fieldOfficerId"),
        ),
    );

  if (status && status !== "ALL") {
    accountsQuery = accountsQuery.where({ status: status as any });
  }

  const allAccounts = await accountsQuery
    .orderBy((a) => a.openedAt.desc())
    .all();

  const filtered = allAccounts.filter((account) => {
    const memberSomitiId = account.member?.somitiId;
    if (somitiId && memberSomitiId !== somitiId) return false;
    if (allowedSomitiIds !== null) {
      if (!memberSomitiId || !allowedSomitiIds.includes(memberSomitiId)) {
        return false;
      }
    }
    return true;
  });

  const total = filtered.length;
  const offset = pageOffset(page, limit);
  const pagedAccounts = filtered.slice(offset, offset + limit);

  let totalGeneralBalance = 0;
  let totalSpecialBalance = 0;

  filtered.forEach((acc) => {
    totalGeneralBalance += toNumber(acc.generalSavingsBalance);
    totalSpecialBalance += toNumber(acc.specialSavingsBalance);
  });

  return {
    summary: {
      totalAccounts: total,
      totalGeneralSavingsBalance: totalGeneralBalance,
      totalSpecialSavingsBalance: totalSpecialBalance,
      totalSavingsBalance: totalGeneralBalance + totalSpecialBalance,
    },
    records: pagedAccounts.map((acc) => {
      const general = toNumber(acc.generalSavingsBalance);
      const special = toNumber(acc.specialSavingsBalance);

      return {
        id: acc.id,
        accountId: acc.accountId || `SAV-${acc.id}`,
        member: {
          id: acc.member?.id,
          memberId: acc.member?.memberId,
          fullName: acc.member?.fullName,
          mobileNumber: acc.member?.mobileNumber,
        },
        somiti: acc.member?.somiti
          ? {
              id: acc.member.somiti.id,
              name: acc.member.somiti.name,
              code: acc.member.somiti.code,
            }
          : null,
        generalSavingsBalance: general,
        specialSavingsBalance: special,
        totalBalance: general + special,
        status: acc.status,
        openedAt: acc.openedAt,
      };
    }),
    meta: paginationMeta(page, limit, total),
  };
};

/**
 * 5. DPS Summary Report
 */
export const getDpsSummaryReport = async (query: DpsSummaryReportQuery) => {
  const { somitiId, fieldOfficerId, status, page = 1, limit = 20 } = query;

  let allowedSomitiIds: number[] | null = null;
  if (fieldOfficerId) {
    const assignedSomities = await db.orm.public.Somiti.select("id")
      .where({ fieldOfficerId })
      .all();
    allowedSomitiIds = assignedSomities.map((s) => s.id);
  }

  let accountsQuery = db.orm.public.DpsAccount.select(
    "id",
    "dpsNumber",
    "memberId",
    "installmentAmount",
    "durationMonths",
    "interestRate",
    "totalPrincipal",
    "maturityAmount",
    "totalPaidAmount",
    "paidInstallments",
    "status",
    "startDate",
    "maturityDate",
    "createdAt",
  )
    .include("member", (member) =>
      member
        .select("id", "memberId", "fullName", "mobileNumber", "somitiId")
        .include("somiti", (somiti) =>
          somiti.select("id", "somitiId", "name", "code", "fieldOfficerId"),
        ),
    );

  if (status && status !== "ALL") {
    accountsQuery = accountsQuery.where({ status: status as any });
  }

  const allAccounts = await accountsQuery
    .orderBy((a) => a.createdAt.desc())
    .all();

  const filtered = allAccounts.filter((account) => {
    const memberSomitiId = account.member?.somitiId;
    if (somitiId && memberSomitiId !== somitiId) return false;
    if (allowedSomitiIds !== null) {
      if (!memberSomitiId || !allowedSomitiIds.includes(memberSomitiId)) {
        return false;
      }
    }
    return true;
  });

  const total = filtered.length;
  const offset = pageOffset(page, limit);
  const pagedAccounts = filtered.slice(offset, offset + limit);

  let activeCount = 0;
  let totalMonthlyDemand = 0;
  let totalPaidAmount = 0;
  let totalMaturityLiability = 0;

  filtered.forEach((acc) => {
    if (acc.status === "ACTIVE") {
      activeCount++;
      totalMonthlyDemand += toNumber(acc.installmentAmount);
    }
    totalPaidAmount += toNumber(acc.totalPaidAmount);
    totalMaturityLiability += toNumber(acc.maturityAmount);
  });

  return {
    summary: {
      totalAccounts: total,
      activeAccounts: activeCount,
      totalMonthlyDemand,
      totalPaidAmount,
      totalMaturityLiability,
    },
    records: pagedAccounts.map((acc) => ({
      id: acc.id,
      dpsNumber: acc.dpsNumber || `DPS-${acc.id}`,
      member: {
        id: acc.member?.id,
        memberId: acc.member?.memberId,
        fullName: acc.member?.fullName,
        mobileNumber: acc.member?.mobileNumber,
      },
      somiti: acc.member?.somiti
        ? {
            id: acc.member.somiti.id,
            name: acc.member.somiti.name,
            code: acc.member.somiti.code,
          }
        : null,
      installmentAmount: toNumber(acc.installmentAmount),
      durationMonths: acc.durationMonths,
      interestRate: toNumber(acc.interestRate),
      totalPaidAmount: toNumber(acc.totalPaidAmount),
      paidInstallments: acc.paidInstallments,
      maturityAmount: toNumber(acc.maturityAmount),
      status: acc.status,
      startDate: acc.startDate,
      maturityDate: acc.maturityDate,
    })),
    meta: paginationMeta(page, limit, total),
  };
};
