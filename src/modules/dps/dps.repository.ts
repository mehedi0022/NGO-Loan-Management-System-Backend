import { Temporal } from "temporal-polyfill";
import { db } from "../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../utils/pagination.js";
import type {
  CreateDpsAccountInput,
  DepositDpsInput,
  CloseDpsInput,
  DpsListQuery,
} from "./dps.types.js";

const cents = (value: string | number) => Math.round(Number(value) * 100);
const money = (value: number) => (value / 100).toFixed(2);
const toInstant = (date: Date) => Temporal.Instant.from(date.toISOString());

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const calculateDpsMaturity = (
  installmentAmount: number,
  durationMonths: number,
  interestRate: number,
  frequency: "WEEKLY" | "MONTHLY" = "MONTHLY",
) => {
  const isWeekly = frequency === "WEEKLY";
  const installmentCount = isWeekly
    ? Math.round((durationMonths / 12) * 52)
    : durationMonths;

  const totalPrincipal = installmentAmount * installmentCount;
  // Standard statutory recurring deposit / DPS interest formula
  // Monthly: (P * n * (n + 1) * r) / (2 * 12 * 100) = 2400
  // Weekly:  (P * n * (n + 1) * r) / (2 * 52 * 100) = 10400
  const divisor = isWeekly ? 10400 : 2400;
  const profit =
    (installmentAmount * installmentCount * (installmentCount + 1) * interestRate) / divisor;
  const maturityAmount = totalPrincipal + profit;
  return {
    totalPrincipal: totalPrincipal.toFixed(2),
    profit: profit.toFixed(2),
    maturityAmount: maturityAmount.toFixed(2),
    installmentCount,
  };
};

export const createDpsAccount = async (
  input: CreateDpsAccountInput,
  openedById: number,
) =>
  db.transaction(async (tx: any) => {
    const member = await tx.orm.public.Member.select("id", "status").first({
      id: input.memberId,
    });
    if (!member) return { kind: "NO_MEMBER" as const };
    if (member.status !== "ACTIVE") return { kind: "MEMBER_INACTIVE" as const };

    const frequency = input.frequency || "MONTHLY";
    const isWeekly = frequency === "WEEKLY";

    const { totalPrincipal, maturityAmount, installmentCount } = calculateDpsMaturity(
      input.installmentAmount,
      input.durationMonths,
      input.interestRate,
      frequency,
    );

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const maturityDate = addMonths(startDate, input.durationMonths);

    const created = await tx.orm.public.DpsAccount.create({
      memberId: input.memberId,
      frequency,
      installmentAmount: input.installmentAmount.toFixed(2),
      durationMonths: input.durationMonths,
      interestRate: input.interestRate.toFixed(2),
      totalPrincipal,
      maturityAmount,
      totalPaidAmount: "0.00",
      paidInstallments: 0,
      startDate: toInstant(startDate),
      maturityDate: toInstant(maturityDate),
      status: "ACTIVE",
      notes: input.notes || null,
      openedById,
    });

    const dpsNumber = `DPS-${String(created.id).padStart(6, "0")}`;
    await tx.orm.public.DpsAccount.where({ id: created.id }).update({
      dpsNumber,
    });

    // Generate installment schedule (Weekly vs Monthly)
    for (let i = 1; i <= installmentCount; i += 1) {
      const dueDate = isWeekly
        ? addDays(startDate, i * 7)
        : addMonths(startDate, i);

      await tx.orm.public.DpsInstallment.create({
        dpsAccountId: created.id,
        installmentNo: i,
        dueDate: toInstant(dueDate),
        amount: input.installmentAmount.toFixed(2),
        paidAmount: "0.00",
        status: "PENDING",
      });
    }

    return {
      kind: "SUCCESS" as const,
      dpsAccountId: created.id,
      dpsNumber,
    };
  });

export const findDpsAccounts = async (query: DpsListQuery) => {
  const { page, limit, sortBy, sortOrder, memberId, status, search } = query;

  const selectedAccounts = db.orm.public.DpsAccount.select(
    "id",
    "dpsNumber",
    "memberId",
    "frequency",
    "installmentAmount",
    "durationMonths",
    "interestRate",
    "totalPrincipal",
    "maturityAmount",
    "totalPaidAmount",
    "paidInstallments",
    "startDate",
    "maturityDate",
    "status",
    "notes",
    "createdAt",
  )
    .include("member", (member: any) =>
      member
        .select(
          "id",
          "memberId",
          "fullName",
          "fatherName",
          "guardianName",
          "mobileNumber",
          "photoUrl",
          "somitiId",
        )
        .include("somiti", (somiti: any) =>
          somiti.select("id", "somitiId", "name", "code", "meetingDay"),
        ),
    )
    .include("openedBy", (user: any) => user.select("id", "userName", "fullName"));

  let filteredAccounts: any = selectedAccounts;

  if (memberId) {
    filteredAccounts = filteredAccounts.where({ memberId });
  }

  if (query.somitiId) {
    filteredAccounts = filteredAccounts.where((account: any) =>
      account.member.somitiId.equals(query.somitiId),
    );
  }

  if (query.frequency) {
    filteredAccounts = filteredAccounts.where({ frequency: query.frequency });
  }

  if (status) {
    filteredAccounts = filteredAccounts.where({ status });
  }

  if (search) {
    const term = search.trim();
    filteredAccounts = filteredAccounts.where((account: any) =>
      account.dpsNumber.ilike(`%${term}%`),
    );
  }

  const offset = pageOffset(page, limit);

  const orderedQuery = (() => {
    switch (sortBy) {
      case "startDate":
        return filteredAccounts.orderBy((acc: any) =>
          sortOrder === "asc" ? acc.startDate.asc() : acc.startDate.desc(),
        );
      case "maturityDate":
        return filteredAccounts.orderBy((acc: any) =>
          sortOrder === "asc" ? acc.maturityDate.asc() : acc.maturityDate.desc(),
        );
      case "installmentAmount":
        return filteredAccounts.orderBy((acc: any) =>
          sortOrder === "asc" ? acc.installmentAmount.asc() : acc.installmentAmount.desc(),
        );
      case "id":
        return filteredAccounts.orderBy((acc: any) =>
          sortOrder === "asc" ? acc.id.asc() : acc.id.desc(),
        );
      case "createdAt":
      default:
        return filteredAccounts.orderBy((acc: any) =>
          sortOrder === "asc" ? acc.createdAt.asc() : acc.createdAt.desc(),
        );
    }
  })();

  const [{ total }, accounts] = await Promise.all([
    filteredAccounts.aggregate((aggregate: any) => ({ total: aggregate.count() })),
    orderedQuery.offset(offset).limit(limit).all(),
  ]);

  return { accounts, meta: paginationMeta(page, limit, total) };
};

export const findDpsAccountById = async (id: number) => {
  const account = await db.orm.public.DpsAccount.select(
    "id",
    "dpsNumber",
    "memberId",
    "frequency",
    "installmentAmount",
    "durationMonths",
    "interestRate",
    "totalPrincipal",
    "maturityAmount",
    "totalPaidAmount",
    "paidInstallments",
    "startDate",
    "maturityDate",
    "status",
    "notes",
    "createdAt",
  )
    .include("member", (member: any) =>
      member
        .select(
          "id",
          "memberId",
          "fullName",
          "fatherName",
          "guardianName",
          "mobileNumber",
          "photoUrl",
          "somitiId",
        )
        .include("somiti", (somiti: any) =>
          somiti.select("id", "somitiId", "name", "code", "meetingDay"),
        ),
    )
    .include("openedBy", (user: any) => user.select("id", "userName", "fullName"))
    .include("installments", (installments: any) =>
      installments
        .select(
          "id",
          "installmentNo",
          "dueDate",
          "amount",
          "paidAmount",
          "status",
          "paidAt",
        )
        .orderBy((inst: any) => inst.installmentNo.asc()),
    )
    .include("transactions", (transactions: any) =>
      transactions
        .select(
          "id",
          "transactionId",
          "type",
          "amount",
          "balanceBefore",
          "balanceAfter",
          "transactionDate",
          "paymentMethod",
          "reference",
          "notes",
          "createdAt",
        )
        .orderBy((trx: any) => trx.id.desc()),
    )
    .first({ id });

  return account;
};

export const depositDpsInstallment = async (
  dpsAccountId: number,
  input: DepositDpsInput,
  processedById: number,
) =>
  db.transaction(async (tx: any) => {
    const account = await tx.orm.public.DpsAccount.select(
      "id",
      "status",
      "frequency",
      "totalPaidAmount",
      "paidInstallments",
      "durationMonths",
      "installmentAmount",
    ).first({ id: dpsAccountId });

    if (!account) return { kind: "NO_ACCOUNT" as const };
    if (account.status !== "ACTIVE") return { kind: "ACCOUNT_NOT_ACTIVE" as const };

    const depositCents = cents(input.amount);
    const currentPaidCents = cents(account.totalPaidAmount);
    const balanceAfterCents = currentPaidCents + depositCents;

    const transactionDate = input.transactionDate ? new Date(input.transactionDate) : new Date();

    // Waterfall distribution across pending / partial installments
    const allInstallments = await tx.orm.public.DpsInstallment.select(
      "id",
      "installmentNo",
      "amount",
      "paidAmount",
      "status",
    )
      .where({ dpsAccountId })
      .orderBy((inst: any) => inst.installmentNo.asc())
      .all();

    const pendingInstallments = allInstallments.filter(
      (inst: any) => inst.status !== "PAID",
    );

    let remainingDepositCents = depositCents;

    for (const inst of pendingInstallments) {
      if (remainingDepositCents <= 0) break;

      const instAmountCents = cents(inst.amount);
      const currentInstPaidCents = cents(inst.paidAmount);
      const neededCents = Math.max(0, instAmountCents - currentInstPaidCents);

      if (neededCents === 0) continue;

      if (remainingDepositCents >= neededCents) {
        await tx.orm.public.DpsInstallment.where({ id: inst.id }).update({
          paidAmount: money(instAmountCents),
          status: "PAID",
          paidAt: toInstant(transactionDate),
        });
        remainingDepositCents -= neededCents;
      } else {
        const newPaidCents = currentInstPaidCents + remainingDepositCents;
        await tx.orm.public.DpsInstallment.where({ id: inst.id }).update({
          paidAmount: money(newPaidCents),
          status: "PARTIAL",
        });
        remainingDepositCents = 0;
      }
    }

    // Count fully paid installments accurately
    const { paidCount } = await tx.orm.public.DpsInstallment.where({
      dpsAccountId,
      status: "PAID",
    }).aggregate((agg: any) => ({
      paidCount: agg.count(),
    }));

    const isWeekly = account.frequency === "WEEKLY";
    const totalInstallments = isWeekly
      ? Math.round((account.durationMonths / 12) * 52)
      : account.durationMonths;

    const isMatured = paidCount >= totalInstallments;

    await tx.orm.public.DpsAccount.where({ id: account.id }).update({
      totalPaidAmount: money(balanceAfterCents),
      paidInstallments: paidCount,
      status: isMatured ? "MATURED" : "ACTIVE",
    });

    const transaction = await tx.orm.public.DpsTransaction.create({
      dpsAccountId: account.id,
      processedById,
      type: "DEPOSIT",
      amount: money(depositCents),
      balanceBefore: money(currentPaidCents),
      balanceAfter: money(balanceAfterCents),
      transactionDate: toInstant(transactionDate),
      paymentMethod: input.paymentMethod || "CASH",
      reference: input.reference || null,
      notes: input.notes || null,
    });

    const transactionId = `DTX-${String(transaction.id).padStart(6, "0")}`;
    await tx.orm.public.DpsTransaction.where({ id: transaction.id }).update({
      transactionId,
    });

    return {
      kind: "SUCCESS" as const,
      transactionId,
      newBalance: money(balanceAfterCents),
      isMatured,
    };
  });

export const closeDpsAccount = async (
  dpsAccountId: number,
  input: CloseDpsInput,
  processedById: number,
) =>
  db.transaction(async (tx: any) => {
    const account = await tx.orm.public.DpsAccount.select(
      "id",
      "status",
      "totalPaidAmount",
      "maturityAmount",
      "paidInstallments",
      "durationMonths",
    ).first({ id: dpsAccountId });

    if (!account) return { kind: "NO_ACCOUNT" as const };
    if (account.status === "CLOSED") return { kind: "ALREADY_CLOSED" as const };

    const isMatured =
      account.status === "MATURED" ||
      account.paidInstallments >= account.durationMonths;

    const closeType =
      input.closeType || (isMatured ? "MATURITY_PAYOUT" : "PREMATURE_CLOSE");

    const defaultPayout =
      closeType === "MATURITY_PAYOUT"
        ? account.maturityAmount
        : account.totalPaidAmount;

    const payoutAmount =
      input.payoutAmount !== undefined
        ? input.payoutAmount.toFixed(2)
        : defaultPayout;

    await tx.orm.public.DpsAccount.where({ id: account.id }).update({
      status: "CLOSED",
      notes: input.notes || null,
    });

    const txDate = input.transactionDate
      ? new Date(input.transactionDate)
      : new Date();

    const transaction = await tx.orm.public.DpsTransaction.create({
      dpsAccountId: account.id,
      processedById,
      type: closeType,
      amount: payoutAmount,
      balanceBefore: account.totalPaidAmount,
      balanceAfter: "0.00",
      transactionDate: toInstant(txDate),
      paymentMethod: input.paymentMethod || "CASH",
      notes:
        input.notes ||
        (closeType === "MATURITY_PAYOUT"
          ? `Maturity settlement with payout of ${payoutAmount}`
          : `Premature DPS closure with refund of ${payoutAmount}`),
    });

    const transactionId = `DTX-${String(transaction.id).padStart(6, "0")}`;
    await tx.orm.public.DpsTransaction.where({ id: transaction.id }).update({
      transactionId,
    });

    return {
      kind: "SUCCESS" as const,
      transactionId,
      payoutAmount,
      closeType,
    };
  });
