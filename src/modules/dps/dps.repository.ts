import { Temporal } from "temporal-polyfill";
import { db } from "../../prisma/db.js";
import { pageOffset, paginationMeta } from "../../utils/pagination.js";
import { recordTransaction } from "../accounts/repositories/accounts.repository.js";
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

    const rawStartDate = input.startDate as any;
    const startDateStr = rawStartDate
      ? typeof rawStartDate === "string"
        ? rawStartDate.slice(0, 10)
        : rawStartDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const startPlain = Temporal.PlainDate.from(startDateStr);
    const startInstant = Temporal.Instant.from(`${startDateStr}T00:00:00Z`);

    const maturityPlain = isWeekly
      ? startPlain.add({ weeks: installmentCount })
      : startPlain.with({ day: 1 }).add({ months: input.durationMonths }).with({
          day: Math.min(
            startPlain.day,
            startPlain.with({ day: 1 }).add({ months: input.durationMonths }).daysInMonth,
          ),
        });
    const maturityInstant = Temporal.Instant.from(`${maturityPlain.toString()}T00:00:00Z`);

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
      startDate: startInstant,
      maturityDate: maturityInstant,
      status: "ACTIVE",
      notes: input.notes || null,
      openedById,
    });

    const dpsNumber = `DPS-${String(created.id).padStart(6, "0")}`;
    await tx.orm.public.DpsAccount.where({ id: created.id }).update({
      dpsNumber,
    });

    // Generate installment schedule (Weekly vs Monthly)
    // First installment is due on startDate (index 0)
    for (let i = 1; i <= installmentCount; i += 1) {
      const instPlain = isWeekly
        ? startPlain.add({ weeks: i - 1 })
        : startPlain.with({ day: 1 }).add({ months: i - 1 }).with({
            day: Math.min(
              startPlain.day,
              startPlain.with({ day: 1 }).add({ months: i - 1 }).daysInMonth,
            ),
          });

      await tx.orm.public.DpsInstallment.create({
        dpsAccountId: created.id,
        installmentNo: i,
        dueDate: Temporal.Instant.from(`${instPlain.toString()}T00:00:00Z`),
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

    // Auto-record in cash accounting ledger
    try {
      const defaultAccount =
        (await tx.orm.public.FinancialAccount.select("id")
          .first({ isDefault: true, isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id")
          .first({ isActive: true }));

      if (defaultAccount && depositCents > 0) {
        await recordTransaction(tx, {
          accountId: defaultAccount.id,
          type: "DEBIT",
          amount: depositCents / 100,
          sourceModule: "DPS_DEPOSIT",
          referenceId: transactionId,
          description: `Direct DPS deposit for ${account.dpsNumber || `#${account.id}`}`,
          transactionDate: toInstant(transactionDate),
          createdById: processedById,
        });
      }
    } catch (e) {
      console.warn("Could not record dps deposit ledger entry:", e);
    }

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

    // Auto-record DPS payout in cash accounting ledger
    try {
      const defaultAccount =
        (await tx.orm.public.FinancialAccount.select("id")
          .first({ isDefault: true, isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select("id")
          .first({ isActive: true }));

      const payoutNum = Number(payoutAmount);
      if (defaultAccount && payoutNum > 0) {
        await recordTransaction(tx, {
          accountId: defaultAccount.id,
          type: "CREDIT",
          amount: payoutNum,
          sourceModule: "DPS_WITHDRAWAL",
          referenceId: transactionId,
          description: `DPS ${closeType} payout for ${account.dpsNumber || `#${account.id}`}`,
          transactionDate: toInstant(txDate),
          createdById: processedById,
        });
      }
    } catch (e) {
      console.warn("Could not record dps closure payout ledger entry:", e);
    }

    return {
      kind: "SUCCESS" as const,
      transactionId,
      payoutAmount,
      closeType,
    };
  });

export const reverseDpsTransaction = async (
  transactionId: number,
  reason: string,
  cancelledById: number,
) => {
  return db.transaction(async (tx: any) => {
    const transaction = await tx.orm.public.DpsTransaction.select(
      "id",
      "transactionId",
      "dpsAccountId",
      "type",
      "amount",
      "collectionId",
    ).first({ id: transactionId });

    if (!transaction) {
      return { kind: "NOT_FOUND" as const };
    }

    const txCode =
      transaction.transactionId ||
      `DTX-${String(transaction.id).padStart(6, "0")}`;

    const account = await tx.orm.public.DpsAccount.select(
      "id",
      "totalPaidAmount",
      "paidInstallments",
      "status",
    ).first({ id: transaction.dpsAccountId });

    if (!account) {
      return { kind: "NO_ACCOUNT" as const };
    }

    const txAmountCents = cents(transaction.amount);
    const currentTotalCents = cents(account.totalPaidAmount);
    const newTotalCents = Math.max(0, currentTotalCents - txAmountCents);

    // Reverse installments in descending order
    const dpsInstallments = await tx.orm.public.DpsInstallment.select(
      "id",
      "installmentNo",
      "amount",
      "paidAmount",
      "status",
    )
      .where({ dpsAccountId: account.id })
      .orderBy((i: any) => i.installmentNo.desc())
      .all();

    let remainingToDeduct = txAmountCents;
    for (const dInst of dpsInstallments) {
      if (remainingToDeduct <= 0) break;
      const instPaidCents = cents(dInst.paidAmount);
      if (instPaidCents <= 0) continue;

      if (instPaidCents <= remainingToDeduct) {
        await tx.orm.public.DpsInstallment.where({ id: dInst.id }).update({
          paidAmount: "0.00",
          status: "PENDING",
          paidAt: null,
        });
        remainingToDeduct -= instPaidCents;
      } else {
        const updatedPaidCents = instPaidCents - remainingToDeduct;
        await tx.orm.public.DpsInstallment.where({ id: dInst.id }).update({
          paidAmount: money(updatedPaidCents),
          status: "PARTIAL",
          paidAt: null,
        });
        remainingToDeduct = 0;
      }
    }

    // Recalculate paid count
    const { paidCount } = await tx.orm.public.DpsInstallment.where({
      dpsAccountId: account.id,
      status: "PAID",
    }).aggregate((agg: any) => ({
      paidCount: agg.count(),
    }));

    await tx.orm.public.DpsAccount.where({ id: account.id }).update({
      totalPaidAmount: money(newTotalCents),
      paidInstallments: Number(paidCount || 0),
      status: "ACTIVE",
    });

    // Cash ledger
    try {
      const defaultAccount =
        (await tx.orm.public.FinancialAccount.select("id").first({
          isDefault: true,
          isActive: true,
        })) ||
        (await tx.orm.public.FinancialAccount.select("id").first({
          isActive: true,
        }));

      if (defaultAccount && txAmountCents > 0) {
        await recordTransaction(tx, {
          accountId: defaultAccount.id,
          type: "CREDIT",
          amount: txAmountCents / 100,
          sourceModule: "DPS_DEPOSIT",
          referenceId: txCode,
          description: `Reversal of DPS ${txCode}: ${reason}`,
          transactionDate: Temporal.Now.instant(),
          createdById: cancelledById,
        });
      }
    } catch (err) {
      console.warn("Could not record DPS reversal in accounts:", err);
    }

    // Delete DpsTransaction
    await tx.orm.public.DpsTransaction.where({ id: transaction.id }).select("id").delete();

    return {
      kind: "SUCCESS" as const,
      transactionId: transaction.id,
      transactionCode: txCode,
    };
  });
};
