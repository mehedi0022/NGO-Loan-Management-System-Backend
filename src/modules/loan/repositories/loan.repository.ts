import { db } from "../../../prisma/db.js";
import { Temporal } from "temporal-polyfill";

import type {
  CreateLoanInput,
  DisburseLoanInput,
  LoanListQuery,
  UpdateLoanInput,
} from "../loan.types.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import { generateInstallmentSchedule } from "../utils/installment-schedule.util.js";

type CreateLoanRepositoryInput = CreateLoanInput & {
  chargeAmount: number;
  totalPayable: number;
  installmentAmount: number;
};

export const createLoan = async (data: CreateLoanRepositoryInput) => {
  return db.orm.public.Loan.create({
    memberId: data.memberId,
    principalAmount: data.principalAmount.toFixed(2),
    chargeType: data.chargeType,
    chargeValue: data.chargeValue.toFixed(2),
    chargeAmount: data.chargeAmount.toFixed(2),
    totalPayable: data.totalPayable.toFixed(2),
    installmentCount: data.installmentCount,
    installmentAmount: data.installmentAmount.toFixed(2),
    frequency: data.frequency,
    status: "PENDING",
    purpose: data.purpose,
    notes: data.notes,
  });
};

export const updateLoanId = async (id: number, loanId: string) => {
  return db.orm.public.Loan.where({
    id,
  })
    .select(
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
      "applicationDate",
      "disbursementDate",
      "firstDueDate",
      "maturityDate",
      "status",
      "purpose",
      "notes",
      "createdAt",
      "updatedAt",
    )
    .update({
      loanId,
    });
};

/**
 * Find all loans with their table-level member details.
 */
export const findAllLoans = async ({
  page,
  limit,
  search,
  status,
  frequency,
  memberId,
  sortBy,
  sortOrder,
}: LoanListQuery) => {
  const selectedLoans = db.orm.public.Loan.select(
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
    "applicationDate",
    "disbursementDate",
    "firstDueDate",
    "maturityDate",
    "status",
    "purpose",
    "notes",
    "createdAt",
    "updatedAt",
  ).include("member", (member) =>
    member.select("id", "memberId", "fullName", "mobileNumber"),
  );

  let filteredLoans = selectedLoans;

  if (status) {
    filteredLoans = filteredLoans.where({ status });
  }

  if (frequency) {
    filteredLoans = filteredLoans.where({ frequency });
  }

  if (memberId) {
    filteredLoans = filteredLoans.where({ memberId });
  }

  if (search) {
    filteredLoans = filteredLoans.where((loan) =>
      loan.loanId.ilike(`%${search.trim()}%`),
    );
  }

  const loansQuery = (() => {
    switch (sortBy) {
      case "id":
        return filteredLoans.orderBy((loan) =>
          sortOrder === "asc" ? loan.id.asc() : loan.id.desc(),
        );

      case "loanId":
        return filteredLoans.orderBy([
          (loan) =>
            sortOrder === "asc" ? loan.loanId.asc() : loan.loanId.desc(),
          (loan) => loan.id.asc(),
        ]);

      case "principalAmount":
        return filteredLoans.orderBy([
          (loan) =>
            sortOrder === "asc"
              ? loan.principalAmount.asc()
              : loan.principalAmount.desc(),
          (loan) => loan.id.asc(),
        ]);

      case "totalPayable":
        return filteredLoans.orderBy([
          (loan) =>
            sortOrder === "asc"
              ? loan.totalPayable.asc()
              : loan.totalPayable.desc(),
          (loan) => loan.id.asc(),
        ]);

      case "applicationDate":
        return filteredLoans.orderBy([
          (loan) =>
            sortOrder === "asc"
              ? loan.applicationDate.asc()
              : loan.applicationDate.desc(),
          (loan) => loan.id.desc(),
        ]);

      case "createdAt":
      default:
        return filteredLoans.orderBy([
          (loan) =>
            sortOrder === "asc" ? loan.createdAt.asc() : loan.createdAt.desc(),
          (loan) => loan.id.desc(),
        ]);
    }
  })();

  const offset = pageOffset(page, limit);

  const [{ total }, loans] = await Promise.all([
    filteredLoans.aggregate((aggregate) => ({
      total: aggregate.count(),
    })),
    loansQuery.offset(offset).limit(limit).all(),
  ]);

  return {
    loans,
    meta: paginationMeta(page, limit, total),
  };
};

/**
 * Find a loan and its basic member details by database ID.
 */
export const findLoanById = async (id: number) => {
  return db.orm.public.Loan.select(
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
    "applicationDate",
    "disbursementDate",
    "firstDueDate",
    "maturityDate",
    "status",
    "purpose",
    "notes",
    "createdAt",
    "updatedAt",
  )
    .include("member", (member) =>
      member.select("id", "memberId", "fullName", "mobileNumber"),
    )
    .include("installments", (installments) =>
      installments.select(
        "id",
        "loanId",
        "installmentNo",
        "dueDate",
        "amount",
        "paidAmount",
        "status",
        "paidAt",
      ),
    )
    .first({ id });
};

type UpdateLoanRepositoryInput = UpdateLoanInput & {
  chargeAmount?: number;
  totalPayable?: number;
  installmentAmount?: number;
};

export const updatePendingLoanById = async (
  id: number,
  data: UpdateLoanRepositoryInput,
) => {
  return db.orm.public.Loan.where({ id, status: "PENDING" })
    .select(
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
      "applicationDate",
      "disbursementDate",
      "firstDueDate",
      "maturityDate",
      "status",
      "purpose",
      "notes",
      "createdAt",
      "updatedAt",
    )
    .update({
      ...(data.memberId !== undefined && { memberId: data.memberId }),
      ...(data.principalAmount !== undefined && {
        principalAmount: data.principalAmount.toFixed(2),
      }),
      ...(data.chargeType !== undefined && { chargeType: data.chargeType }),
      ...(data.chargeValue !== undefined && {
        chargeValue: data.chargeValue.toFixed(2),
      }),
      ...(data.chargeAmount !== undefined && {
        chargeAmount: data.chargeAmount.toFixed(2),
      }),
      ...(data.totalPayable !== undefined && {
        totalPayable: data.totalPayable.toFixed(2),
      }),
      ...(data.installmentCount !== undefined && {
        installmentCount: data.installmentCount,
      }),
      ...(data.installmentAmount !== undefined && {
        installmentAmount: data.installmentAmount.toFixed(2),
      }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.purpose !== undefined && { purpose: data.purpose }),
      ...(data.notes !== undefined && { notes: data.notes }),
    });
};

export const transitionPendingLoan = async (
  id: number,
  data: {
    status: "APPROVED" | "REJECTED";
    approvedById?: number;
    rejectedById?: number;
    rejectionReason?: string;
  },
) =>
  db.orm.public.Loan.where({ id, status: "PENDING" }).update({
    ...data,
    ...(data.status === "APPROVED"
      ? { approvedAt: Temporal.Now.instant() }
      : { rejectedAt: Temporal.Now.instant() }),
  });

const dateToPlainDate = (date: Date) =>
  Temporal.PlainDate.from(date.toISOString().slice(0, 10));

const plainDateToInstant = (date: Temporal.PlainDate) =>
  Temporal.Instant.from(`${date.toString()}T00:00:00Z`);

/**
 * Activates an approved loan and persists its complete repayment schedule as one
 * atomic operation. A failed installment insert rolls back the status change.
 */
export const disburseApprovedLoan = async (
  id: number,
  data: DisburseLoanInput,
) =>
  db.transaction(async (tx) => {
    const loan = await tx.orm.public.Loan.select(
      "id",
      "totalPayable",
      "installmentCount",
      "installmentAmount",
      "frequency",
    ).first({ id, status: "APPROVED" });

    if (!loan) {
      return null;
    }

    const existingInstallment = await tx.orm.public.LoanInstallment.select(
      "id",
    ).first({ loanId: id });

    // An approved loan should never have a schedule, but preserve any existing
    // financial records rather than trying to recreate or delete them.
    if (existingInstallment) {
      return null;
    }

    const schedule = generateInstallmentSchedule({
      totalPayable: loan.totalPayable,
      installmentCount: loan.installmentCount,
      installmentAmount: loan.installmentAmount,
      frequency: loan.frequency,
      firstDueDate: dateToPlainDate(data.firstDueDate),
    });
    const disbursementDate = Temporal.Instant.from(
      data.disbursementDate.toISOString(),
    );
    const firstDueDate = plainDateToInstant(schedule[0].dueDate);
    const maturityDate = plainDateToInstant(schedule.at(-1)!.dueDate);

    for (const installment of schedule) {
      await tx.orm.public.LoanInstallment.create({
        loanId: id,
        installmentNo: installment.installmentNo,
        dueDate: plainDateToInstant(installment.dueDate),
        amount: installment.amount,
        paidAmount: "0.00",
        status: "PENDING",
        paidAt: null,
      });
    }

    return tx.orm.public.Loan.where({
      id,
      status: "APPROVED",
    }).update({
      status: "ACTIVE",
      disbursementDate,
      firstDueDate,
      maturityDate,
    });
  });
