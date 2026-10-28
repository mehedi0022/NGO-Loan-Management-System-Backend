import { db } from "../../../prisma/db.js";
import { Temporal } from "temporal-polyfill";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import { recordTransaction } from "../../accounts/repositories/accounts.repository.js";

import type {
  BatchCollectionInput,
  CreateCollectionInput,
} from "../collection.types.js";

const cents = (value: string | number) => Math.round(Number(value) * 100);

const money = (value: number) => (value / 100).toFixed(2);

const toInstant = (date: Date) => Temporal.Instant.from(date.toISOString());

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CollectionItemInput = {
  memberId: number;
  collectedById: number;

  loanId?: number;
  installmentId?: number;
  dpsAccountId?: number;

  loanCollectionAmount: number;
  generalSavingsAmount: number;
  specialSavingsAmount: number;
  dpsAmount?: number;
  dpsCollections?: Array<{ dpsAccountId: number; amount: number }>;

  collectionDate: Date;
  allowAdvance: boolean;
  paymentMethod: CreateCollectionInput["paymentMethod"];

  reference?: string;
  notes?: string;
};

export type CollectionResult =
  | {
      kind: "SUCCESS";
      collectionId?: number;
    }
  | {
      kind:
        | "NO_MEMBER"
        | "NO_LOAN"
        | "LOAN_MEMBER_MISMATCH"
        | "NO_INSTALLMENT"
        | "INACTIVE_LOAN"
        | "INSTALLMENT_PAID"
        | "OVERPAY"
        | "UPCOMING"
        | "SAVINGS_ACCOUNT_CLOSED"
        | "DPS_ACCOUNT_NOT_ACTIVE"
        | "CONCURRENT";
    };

/**
 * Apply loan payment inside the current transaction.
 *
 * IMPORTANT:
 * This function does not open its own transaction.
 */
const applyLoanPayment = async (
  tx: TransactionClient,
  collectionDbId: number,
  input: CollectionItemInput,
): Promise<CollectionResult> => {
  const {
    memberId,
    loanId,
    installmentId,
    loanCollectionAmount,
    collectionDate,
    paymentMethod,
    reference,
    notes,
  } = input;

  if (loanCollectionAmount <= 0 || !loanId || !installmentId) {
    return { kind: "SUCCESS" };
  }

  const loan = await tx.orm.public.Loan.select(
    "id",
    "memberId",
    "status",
  ).first({
    id: loanId,
  });

  if (!loan) {
    return { kind: "NO_LOAN" };
  }

  if (loan.memberId !== memberId) {
    return { kind: "LOAN_MEMBER_MISMATCH" };
  }

  if (loan.status !== "ACTIVE") {
    return { kind: "INACTIVE_LOAN" };
  }

  const installment = await tx.orm.public.LoanInstallment.select(
    "id",
    "loanId",
    "dueDate",
    "amount",
    "paidAmount",
    "status",
  ).first({
    id: installmentId,
    loanId,
  });

  if (!installment) {
    return { kind: "NO_INSTALLMENT" };
  }

  const installmentAmount = cents(installment.amount);
  const alreadyPaid = cents(installment.paidAmount);
  const paymentAmount = cents(loanCollectionAmount);

  const remaining = installmentAmount - alreadyPaid;

  if (installment.status === "PAID" || remaining <= 0) {
    return { kind: "INSTALLMENT_PAID" };
  }

  if (paymentAmount > remaining) {
    return { kind: "OVERPAY" };
  }

  const paymentDate = toInstant(collectionDate);

  if (
    Temporal.Instant.compare(installment.dueDate, paymentDate) > 0 &&
    !input.allowAdvance
  ) {
    return { kind: "UPCOMING" };
  }

  const newPaidAmount = alreadyPaid + paymentAmount;

  const fullyPaid = newPaidAmount === installmentAmount;

  /**
   * Optimistic concurrency protection.
   *
   * Update only if paidAmount is still the same value
   * that we originally read.
   */
  const updated = await tx.orm.public.LoanInstallment.where({
    id: installmentId,
    loanId,
    paidAmount: installment.paidAmount,
  }).update({
    paidAmount: money(newPaidAmount),

    status: fullyPaid ? "PAID" : "PARTIAL",

    paidAt: fullyPaid ? paymentDate : null,
  });

  if (!updated) {
    return { kind: "CONCURRENT" };
  }

  const payment = await tx.orm.public.LoanPayment.create({
    loanId,
    installmentId,

    collectionId: collectionDbId,

    amount: money(paymentAmount),

    paymentDate,

    paymentMethod,

    reference: reference || null,
    notes: notes || null,
  });

  await tx.orm.public.LoanPayment.where({
    id: payment.id,
  }).update({
    paymentId: `PAY-${String(payment.id).padStart(6, "0")}`,
  });

  /**
   * Automatically complete the loan once every
   * installment is paid.
   */
  const installments = await tx.orm.public.LoanInstallment.select("status")
    .where({
      loanId,
    })
    .all();

  if (
    installments.length > 0 &&
    installments.every((item) => item.status === "PAID")
  ) {
    await tx.orm.public.Loan.where({
      id: loanId,
      status: "ACTIVE",
    }).update({
      status: "COMPLETED",
    });
  }

  return { kind: "SUCCESS" };
};

/**
 * Apply one savings deposit.
 */
const applySavingsDeposit = async (
  tx: TransactionClient,
  collectionDbId: number,
  processedById: number,
  memberId: number,
  savingsType: "GENERAL" | "SPECIAL",
  amount: number,
  collectionDate: Date,
  paymentMethod: CreateCollectionInput["paymentMethod"],
  reference?: string,
  notes?: string,
): Promise<CollectionResult> => {
  if (amount <= 0) {
    return { kind: "SUCCESS" };
  }

  /**
   * Find existing account.
   */
  let account = await tx.orm.public.SavingsAccount.select(
    "id",
    "status",
    "generalSavingsBalance",
    "specialSavingsBalance",
  ).first({
    memberId,
  });

  /**
   * First savings deposit:
   * automatically open an account for the member.
   */
  if (!account) {
    const created = await tx.orm.public.SavingsAccount.create({
      memberId,

      generalSavingsBalance: "0.00",
      specialSavingsBalance: "0.00",

      status: "ACTIVE",
    });

    await tx.orm.public.SavingsAccount.where({
      id: created.id,
    }).update({
      accountId: `SAV-${String(created.id).padStart(6, "0")}`,
    });

    account = await tx.orm.public.SavingsAccount.select(
      "id",
      "status",
      "generalSavingsBalance",
      "specialSavingsBalance",
    ).first({
      id: created.id,
    });
  }

  if (!account) {
    return { kind: "CONCURRENT" };
  }

  if (account.status !== "ACTIVE") {
    return {
      kind: "SAVINGS_ACCOUNT_CLOSED",
    };
  }

  const depositAmount = cents(amount);

  const currentBalance =
    savingsType === "GENERAL"
      ? cents(account.generalSavingsBalance)
      : cents(account.specialSavingsBalance);

  const newBalance = currentBalance + depositAmount;

  /**
   * Update only the selected savings balance.
   *
   * Optimistic concurrency protection prevents two
   * simultaneous deposits from overwriting each other.
   */
  const updated =
    savingsType === "GENERAL"
      ? await tx.orm.public.SavingsAccount.where({
          id: account.id,
          generalSavingsBalance: account.generalSavingsBalance,
        }).update({
          generalSavingsBalance: money(newBalance),
        })
      : await tx.orm.public.SavingsAccount.where({
          id: account.id,
          specialSavingsBalance: account.specialSavingsBalance,
        }).update({
          specialSavingsBalance: money(newBalance),
        });

  if (!updated) {
    return { kind: "CONCURRENT" };
  }

  const transaction = await tx.orm.public.SavingsTransaction.create({
    savingsAccountId: account.id,
    collectionId: collectionDbId,
    processedById,

    savingsType,
    type: "DEPOSIT",

    amount: money(depositAmount),

    balanceBefore: money(currentBalance),
    balanceAfter: money(newBalance),

    transactionDate: toInstant(collectionDate),

    paymentMethod,

    reference: reference || null,
    notes: notes || null,
  });

  await tx.orm.public.SavingsTransaction.where({
    id: transaction.id,
  }).update({
    transactionId: `STX-${String(transaction.id).padStart(6, "0")}`,
  });

  return { kind: "SUCCESS" };
};

/**
 * Apply one DPS installment deposit.
 */
const applyDpsDeposit = async (
  tx: TransactionClient,
  collectionDbId: number,
  processedById: number,
  memberId: number,
  dpsAccountId: number | undefined,
  amount: number,
  collectionDate: Date,
  paymentMethod: CreateCollectionInput["paymentMethod"],
  reference?: string,
  notes?: string,
): Promise<CollectionResult> => {
  if (amount <= 0) {
    return { kind: "SUCCESS" };
  }

  let account: any;
  if (dpsAccountId) {
    account = await tx.orm.public.DpsAccount.select(
      "id",
      "memberId",
      "status",
      "frequency",
      "totalPaidAmount",
      "paidInstallments",
      "durationMonths",
      "installmentAmount",
    ).first({ id: dpsAccountId });
  } else {
    account = await tx.orm.public.DpsAccount.select(
      "id",
      "memberId",
      "status",
      "frequency",
      "totalPaidAmount",
      "paidInstallments",
      "durationMonths",
      "installmentAmount",
    ).first({ memberId, status: "ACTIVE" });
  }

  if (!account || account.status !== "ACTIVE" || account.memberId !== memberId) {
    return { kind: "DPS_ACCOUNT_NOT_ACTIVE" };
  }

  const depositCents = cents(amount);
  const currentPaidCents = cents(account.totalPaidAmount);
  const balanceAfterCents = currentPaidCents + depositCents;

  const paymentDate = toInstant(collectionDate);

  // Waterfall distribution across pending / partial installments
  const allInstallments = await tx.orm.public.DpsInstallment.select(
    "id",
    "installmentNo",
    "amount",
    "paidAmount",
    "status",
  )
    .where({ dpsAccountId: account.id })
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
        paidAt: paymentDate,
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
    dpsAccountId: account.id,
    status: "PAID",
  }).aggregate((agg: any) => ({
    paidCount: agg.count(),
  }));

  const paidCountNum = Number(paidCount || 0);
  const isWeekly = account.frequency === "WEEKLY";
  const totalInstallments = isWeekly
    ? Math.round((account.durationMonths / 12) * 52)
    : account.durationMonths;

  const isMatured = paidCountNum >= totalInstallments;

  await tx.orm.public.DpsAccount.where({ id: account.id }).update({
    totalPaidAmount: money(balanceAfterCents),
    paidInstallments: paidCountNum,
    status: isMatured ? "MATURED" : "ACTIVE",
  });

  const transaction = await tx.orm.public.DpsTransaction.create({
    dpsAccountId: account.id,
    collectionId: collectionDbId,
    processedById,
    type: "DEPOSIT",
    amount: money(depositCents),
    balanceBefore: money(currentPaidCents),
    balanceAfter: money(balanceAfterCents),
    transactionDate: paymentDate,
    paymentMethod: paymentMethod || "CASH",
    reference: reference || null,
    notes: notes || null,
  });

  await tx.orm.public.DpsTransaction.where({ id: transaction.id }).update({
    transactionId: `DTX-${String(transaction.id).padStart(6, "0")}`,
  });

  return { kind: "SUCCESS" };
};

/**
 * Process one complete member collection.
 *
 * Everything runs inside the transaction supplied
 * by the caller.
 */
const applyCollection = async (
  tx: TransactionClient,
  input: CollectionItemInput,
): Promise<CollectionResult> => {
  /**
   * Verify member first.
   */
  const member = await tx.orm.public.Member.select("id").first({
    id: input.memberId,
  });

  if (!member) {
    return { kind: "NO_MEMBER" };
  }

  const loanAmount = cents(input.loanCollectionAmount);
  const generalAmount = cents(input.generalSavingsAmount);
  const specialAmount = cents(input.specialSavingsAmount);

  const dpsCollectionsList =
    Array.isArray(input.dpsCollections) && input.dpsCollections.length > 0
      ? input.dpsCollections.filter((d) => Number(d.amount) > 0)
      : [];

  const dpsCollectionsSumCents = dpsCollectionsList.reduce(
    (sum, d) => sum + cents(d.amount),
    0,
  );

  const fallbackDpsCents = cents(input.dpsAmount || 0);
  const dpsAmount =
    dpsCollectionsList.length > 0 ? dpsCollectionsSumCents : fallbackDpsCents;

  const totalAmount = loanAmount + generalAmount + specialAmount + dpsAmount;

  /**
   * Validation layer already rejects zero collections,
   * but keep repository defensive.
   */
  if (totalAmount <= 0) {
    return { kind: "CONCURRENT" };
  }

  /**
   * Create collection/receipt snapshot.
   */
  const collection = await tx.orm.public.Collection.create({
    memberId: input.memberId,
    collectedById: input.collectedById,

    loanCollectionAmount: money(loanAmount),
    generalSavingsAmount: money(generalAmount),
    specialSavingsAmount: money(specialAmount),
    dpsAmount: money(dpsAmount),
    totalAmount: money(totalAmount),

    collectionDate: toInstant(input.collectionDate),
    paymentMethod: input.paymentMethod,
    reference: input.reference || null,
    notes: input.notes || null,
  });

  await tx.orm.public.Collection.where({
    id: collection.id,
  }).update({
    collectionId: `COL-${String(collection.id).padStart(6, "0")}`,
  });

  /**
   * 1. Loan collection
   */
  const loanResult = await applyLoanPayment(tx, collection.id, input);

  if (loanResult.kind !== "SUCCESS") {
    return loanResult;
  }

  /**
   * 2. General Savings
   */
  const generalResult = await applySavingsDeposit(
    tx,
    collection.id,
    input.collectedById,
    input.memberId,
    "GENERAL",
    input.generalSavingsAmount,
    input.collectionDate,
    input.paymentMethod,
    input.reference,
    input.notes,
  );

  if (generalResult.kind !== "SUCCESS") {
    return generalResult;
  }

  /**
   * 3. Special Savings
   */
  const specialResult = await applySavingsDeposit(
    tx,
    collection.id,
    input.collectedById,
    input.memberId,
    "SPECIAL",
    input.specialSavingsAmount,
    input.collectionDate,
    input.paymentMethod,
    input.reference,
    input.notes,
  );

  if (specialResult.kind !== "SUCCESS") {
    return specialResult;
  }

  /**
   * 4. DPS Installment(s)
   */
  if (dpsCollectionsList.length > 0) {
    for (const dpsItem of dpsCollectionsList) {
      const dpsResult = await applyDpsDeposit(
        tx,
        collection.id,
        input.collectedById,
        input.memberId,
        dpsItem.dpsAccountId,
        dpsItem.amount,
        input.collectionDate,
        input.paymentMethod,
        input.reference,
        input.notes,
      );

      if (dpsResult.kind !== "SUCCESS") {
        return dpsResult;
      }
    }
  } else if ((input.dpsAmount || 0) > 0) {
    const dpsResult = await applyDpsDeposit(
      tx,
      collection.id,
      input.collectedById,
      input.memberId,
      input.dpsAccountId,
      input.dpsAmount || 0,
      input.collectionDate,
      input.paymentMethod,
      input.reference,
      input.notes,
    );

    if (dpsResult.kind !== "SUCCESS") {
      return dpsResult;
    }
  }

  // Auto-record accounting ledger entry
  try {
    const defaultAccount =
      (await tx.orm.public.FinancialAccount.select("id")
        .first({ isDefault: true, isActive: true })) ||
      (await tx.orm.public.FinancialAccount.select("id")
        .first({ isActive: true }));

    if (defaultAccount && totalAmount > 0) {
      const colRef = `COL-${String(collection.id).padStart(6, "0")}`;
      if (loanAmount > 0) {
        await recordTransaction(tx, {
          accountId: defaultAccount.id,
          type: "DEBIT",
          amount: loanAmount / 100,
          sourceModule: "LOAN_COLLECTION",
          referenceId: colRef,
          description: `Loan collection for member #${input.memberId}`,
          transactionDate: toInstant(input.collectionDate),
          createdById: input.collectedById,
        });
      }
      if (generalAmount > 0 || specialAmount > 0) {
        await recordTransaction(tx, {
          accountId: defaultAccount.id,
          type: "DEBIT",
          amount: (generalAmount + specialAmount) / 100,
          sourceModule: "SAVINGS_DEPOSIT",
          referenceId: colRef,
          description: `Savings deposit for member #${input.memberId}`,
          transactionDate: toInstant(input.collectionDate),
          createdById: input.collectedById,
        });
      }
      if (dpsAmount > 0) {
        await recordTransaction(tx, {
          accountId: defaultAccount.id,
          type: "DEBIT",
          amount: dpsAmount / 100,
          sourceModule: "DPS_DEPOSIT",
          referenceId: colRef,
          description: `DPS deposit for member #${input.memberId}`,
          transactionDate: toInstant(input.collectionDate),
          createdById: input.collectedById,
        });
      }
    }
  } catch (err) {
    console.warn("Could not record collection ledger entry:", err);
  }

  return {
    kind: "SUCCESS",
    collectionId: collection.id,
  };
};

/**
 * Used internally so returning an error result causes
 * the transaction to rollback instead of committing the
 * partially-created Collection.
 */
class CollectionTransactionError extends Error {
  constructor(
    readonly result: Exclude<
      CollectionResult,
      { kind: "SUCCESS"; collectionId?: number }
    >,
    readonly itemIndex?: number,
  ) {
    super(result.kind);
  }
}

/**
 * POST /collections
 */
export const createCollection = async (
  data: CreateCollectionInput,
  authenticatedUserId: number,
): Promise<CollectionResult> => {
  try {
    return await db.transaction(async (tx) => {
      const result = await applyCollection(tx, {
        memberId: data.memberId,
        collectedById: authenticatedUserId,

        loanId: data.loanId,
        installmentId: data.installmentId,

        loanCollectionAmount: data.loanCollectionAmount,

        generalSavingsAmount: data.generalSavingsAmount,

        specialSavingsAmount: data.specialSavingsAmount,

        dpsAccountId: data.dpsAccountId,
        dpsAmount: data.dpsAmount,
        dpsCollections: data.dpsCollections,

        collectionDate: data.collectionDate,
        allowAdvance: data.allowAdvance,

        paymentMethod: data.paymentMethod,

        reference: data.reference,
        notes: data.notes,
      });

      /**
       * IMPORTANT:
       * Returning an error would COMMIT the Collection
       * created before the error occurred.
       *
       * Throw instead so Prisma rolls everything back.
       */
      if (result.kind !== "SUCCESS") {
        throw new CollectionTransactionError(result);
      }

      return result;
    });
  } catch (error) {
    if (error instanceof CollectionTransactionError) {
      return error.result;
    }

    throw error;
  }
};

/**
 * POST /collections/batch
 *
 * Entire batch is atomic:
 * if one member fails, the whole batch rolls back.
 */
export const createBatchCollections = async (
  data: BatchCollectionInput,
  authenticatedUserId: number,
) => {
  try {
    return await db.transaction(async (tx) => {
      const collectionIds: number[] = [];

      for (const [itemIndex, item] of data.items.entries()) {
        const result = await applyCollection(tx, {
          memberId: item.memberId,
          collectedById: authenticatedUserId,

          loanId: item.loanId,
          installmentId: item.installmentId,

          loanCollectionAmount: item.loanCollectionAmount,

          generalSavingsAmount: item.generalSavingsAmount,

          specialSavingsAmount: item.specialSavingsAmount,

          dpsAccountId: item.dpsAccountId,
          dpsAmount: item.dpsAmount,
          dpsCollections: item.dpsCollections,

          collectionDate: data.collectionDate,
          allowAdvance: data.allowAdvance,

          paymentMethod: item.paymentMethod ?? data.paymentMethod,

          reference: data.reference,

          notes: data.notes,
        });

        if (result.kind !== "SUCCESS") {
          throw new CollectionTransactionError(result, itemIndex);
        }

        if (result.collectionId !== undefined) {
          collectionIds.push(result.collectionId);
        }
      }

      return {
        kind: "SUCCESS" as const,
        collectedCount: data.items.length,
        collectionIds,
      };
    });
  } catch (error) {
    if (error instanceof CollectionTransactionError) {
      return {
        ...error.result,
        itemIndex: error.itemIndex,
      };
    }

    throw error;
  }
};

/**
 * GET /collections/installments
 */
export const findDueInstallments = async (
  dueDate: Date,
  somitiId?: number,
  fieldOfficerId?: number,
) => {
  const dateStr = dueDate.toISOString().slice(0, 10);
  const startOfDay = Temporal.Instant.from(`${dateStr}T00:00:00Z`);
  const endOfDay = Temporal.Instant.from(`${dateStr}T23:59:59.999Z`);

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
        .select("id", "loanId", "status")
        .include("member", (member) =>
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
            .include("savingsAccount", (savings) =>
              savings.select(
                "id",
                "accountId",
                "generalSavingsBalance",
                "specialSavingsBalance",
              ),
            )
            .include("dpsAccounts", (dps) =>
              dps
                .select(
                  "id",
                  "dpsNumber",
                  "status",
                  "frequency",
                  "installmentAmount",
                  "totalPaidAmount",
                  "paidInstallments",
                  "durationMonths",
                )
                .where({ status: "ACTIVE" }),
            )
            .include("somiti", (somiti) =>
              somiti
                .select(
                  "id",
                  "somitiId",
                  "name",
                  "code",
                  "meetingDay",
                  "fieldOfficerId",
                )
                .include("fieldOfficer", (officer) =>
                  officer.select("id", "fullName", "userName", "email", "role"),
                ),
            ),
        ),
    )
    .where((inst: any) => inst.dueDate.gte(startOfDay))
    .where((inst: any) => inst.dueDate.lte(endOfDay))
    .orderBy((installment) => installment.installmentNo.asc())
    .all();

  const validLoanInstallments = installments.filter((installment) => {
    if (installment.loan?.status !== "ACTIVE") return false;
    if (installment.status !== "PENDING" && installment.status !== "PARTIAL") {
      return false;
    }

    if (somitiId && installment.loan?.member?.somitiId !== somitiId) {
      return false;
    }

    if (
      fieldOfficerId &&
      installment.loan?.member?.somiti?.fieldOfficerId !== fieldOfficerId
    ) {
      return false;
    }

    return true;
  });

  const memberIdsWithLoan = new Set(
    validLoanInstallments
      .map((i) => i.loan?.member?.id)
      .filter(Boolean),
  );

  // Fetch DPS installments strictly due on this date (PENDING or PARTIAL only)
  const dpsDueInstallments = await db.orm.public.DpsInstallment.select(
    "id",
    "dpsAccountId",
    "installmentNo",
    "dueDate",
    "amount",
    "paidAmount",
    "status",
  )
    .include("dpsAccount", (dps: any) =>
      dps
        .select("id", "dpsNumber", "status", "frequency", "memberId")
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
            .include("savingsAccount", (savings: any) =>
              savings.select(
                "id",
                "accountId",
                "generalSavingsBalance",
                "specialSavingsBalance",
              ),
            )
            .include("dpsAccounts", (mDps: any) =>
              mDps
                .select(
                  "id",
                  "dpsNumber",
                  "status",
                  "frequency",
                  "installmentAmount",
                  "totalPaidAmount",
                  "paidInstallments",
                  "durationMonths",
                )
                .where({ status: "ACTIVE" }),
            )
            .include("somiti", (somiti: any) =>
              somiti
                .select(
                  "id",
                  "somitiId",
                  "name",
                  "code",
                  "meetingDay",
                  "fieldOfficerId",
                )
                .include("fieldOfficer", (officer: any) =>
                  officer.select("id", "fullName", "userName", "email", "role"),
                ),
            ),
        ),
    )
    .where((inst: any) => inst.dueDate.gte(startOfDay))
    .where((inst: any) => inst.dueDate.lte(endOfDay))
    .all();

  const dpsOnlyRows: any[] = [];
  const processedDpsMemberIds = new Set<number>();

  for (const dpsInst of (dpsDueInstallments as any[])) {
    if (dpsInst.status !== "PENDING" && dpsInst.status !== "PARTIAL") continue;
    if (dpsInst.dpsAccount?.status !== "ACTIVE") continue;

    const m = dpsInst.dpsAccount?.member;
    if (!m) continue;

    if (memberIdsWithLoan.has(m.id)) continue;
    if (processedDpsMemberIds.has(m.id)) continue;

    if (somitiId && m.somitiId !== somitiId) continue;
    if (fieldOfficerId && m.somiti?.fieldOfficerId !== fieldOfficerId) continue;

    processedDpsMemberIds.add(m.id);

    dpsOnlyRows.push({
      id: `dps-mem-${m.id}`,
      loanId: null,
      installmentNo: dpsInst.installmentNo,
      dueDate: startOfDay,
      amount: dpsInst.amount,
      paidAmount: dpsInst.paidAmount,
      status: dpsInst.status,
      isDpsOnly: true,
      loan: {
        id: null,
        loanId: "DPS Only",
        status: "NONE",
        member: m,
      },
    });
  }

  return [...validLoanInstallments, ...dpsOnlyRows];
};

/**
 * GET /collections
 */
export const findCollections = async (filters: {
  memberId?: number;
  somitiId?: number;
  collectedById?: number;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}) => {
  const { memberId, somitiId, collectedById, fromDate, toDate, page, limit } =
    filters;

  let query = db.orm.public.Collection.select(
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
        .select(
          "id",
          "memberId",
          "fullName",
          "mobileNumber",
          "photoUrl",
          "somitiId",
        )
        .include("somiti", (somiti) =>
          somiti.select("id", "somitiId", "name", "code"),
        ),
    )
    .include("collectedBy", (user) =>
      user.select("id", "userName", "fullName"),
    );

  if (memberId) {
    query = query.where({
      memberId,
    });
  }

  if (somitiId) {
    const somitiMembers = await db.orm.public.Member.select("id").where({ somitiId }).all();
    const memberIds = somitiMembers.map((m: any) => m.id);
    if (memberIds.length === 0) {
      return {
        data: [],
        pagination: paginationMeta(page, limit, 0),
      };
    }
    query = query.where((c: any) => c.memberId.in(memberIds));
  }

  if (collectedById) {
    query = query.where({
      collectedById,
    });
  }

  if (fromDate) {
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);
    const fromInstant = toInstant(startOfDay);
    query = query.where((c) => c.collectionDate.gte(fromInstant));
  }

  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    const toInstantVal = toInstant(endOfDay);
    query = query.where((c) => c.collectionDate.lte(toInstantVal));
  }

  const [{ total }, data] = await Promise.all([
    query.aggregate((aggregate) => ({ total: aggregate.count() })),
    query
      .orderBy([
        (collection) => collection.collectionDate.desc(),
        (collection) => collection.id.desc(),
      ])
      .offset(pageOffset(page, limit))
      .limit(limit)
      .all(),
  ]);

  return {
    data,
    pagination: paginationMeta(page, limit, total),
  };
};

/**
 * GET /collections/:collectionId
 */
export const findCollectionById = (collectionId: number) =>
  db.orm.public.Collection.select(
    "id",
    "collectionId",
    "memberId",
    "loanCollectionAmount",
    "generalSavingsAmount",
    "specialSavingsAmount",
    "totalAmount",
    "collectionDate",
    "paymentMethod",
    "reference",
    "notes",
    "createdAt",
  )
    .include("member", (member) =>
      member.select("id", "memberId", "fullName", "mobileNumber", "photoUrl"),
    )
    .include("collectedBy", (user) =>
      user.select("id", "userName", "fullName"),
    )
    .include("loanPayments", (payment) =>
      payment
        .select(
          "id",
          "paymentId",
          "loanId",
          "installmentId",
          "amount",
          "paymentDate",
          "paymentMethod",
        )
        .include("installment", (installment) =>
          installment.select("installmentNo"),
        ),
    )
    .include("savingsTransactions", (transaction) =>
      transaction.select(
        "id",
        "transactionId",
        "savingsType",
        "type",
        "amount",
        "balanceBefore",
        "balanceAfter",
        "transactionDate",
      ),
    )
    .first({
      id: collectionId,
    });

export const reverseCollection = async (
  collectionId: number,
  reason: string,
  cancelledById: number,
) => {
  return db.transaction(async (tx) => {
    const collection: any = await tx.orm.public.Collection.select(
      "id",
      "collectionId",
      "memberId",
      "loanCollectionAmount",
      "generalSavingsAmount",
      "specialSavingsAmount",
      "dpsAmount",
      "totalAmount",
      "notes",
    )
      .include("loanPayments", (p: any) =>
        p.select("id", "loanId", "installmentId", "amount"),
      )
      .include("savingsTransactions", (s: any) =>
        s.select("id", "savingsAccountId", "savingsType", "type", "amount"),
      )
      .include("dpsTransactions", (d: any) =>
        d.select("id", "dpsAccountId", "type", "amount"),
      )
      .first({ id: collectionId });

    if (!collection) {
      return { kind: "NOT_FOUND" as const };
    }

    const colCode = collection.collectionId || `COL-${String(collection.id).padStart(6, "0")}`;

    // Rollback Loan Payments
    const loanPayments: any[] = Array.isArray(collection.loanPayments)
      ? collection.loanPayments
      : [];
    for (const payment of loanPayments) {
      if (payment.installmentId && payment.loanId) {
        const inst = await tx.orm.public.LoanInstallment.select(
          "id",
          "paidAmount",
          "amount",
          "status",
        ).first({ id: payment.installmentId });

        if (inst) {
          const instPaidCents = cents(inst.paidAmount);
          const paymentCents = cents(payment.amount);
          const newPaidCents = Math.max(0, instPaidCents - paymentCents);
          const newStatus = newPaidCents === 0 ? "PENDING" : "PARTIAL";

          await tx.orm.public.LoanInstallment.where({ id: inst.id }).update({
            paidAmount: money(newPaidCents),
            status: newStatus,
            paidAt: null,
          });

          await tx.orm.public.Loan.where({ id: payment.loanId, status: "COMPLETED" }).update({
            status: "ACTIVE",
          });
        }
      }
      await tx.orm.public.LoanPayment.where({ id: payment.id }).select("id").delete();
    }

    // Rollback Savings Transactions
    const savingsTransactions: any[] = Array.isArray(collection.savingsTransactions)
      ? collection.savingsTransactions
      : [];
    for (const stx of savingsTransactions) {
      if (stx.savingsAccountId && stx.type === "DEPOSIT") {
        const savAcc = await tx.orm.public.SavingsAccount.select(
          "id",
          "generalSavingsBalance",
          "specialSavingsBalance",
        ).first({ id: stx.savingsAccountId });

        if (savAcc) {
          const stxAmountCents = cents(stx.amount);
          if (stx.savingsType === "GENERAL") {
            const currentCents = cents(savAcc.generalSavingsBalance);
            const newCents = Math.max(0, currentCents - stxAmountCents);
            await tx.orm.public.SavingsAccount.where({ id: savAcc.id }).update({
              generalSavingsBalance: money(newCents),
            });
          } else {
            const currentCents = cents(savAcc.specialSavingsBalance);
            const newCents = Math.max(0, currentCents - stxAmountCents);
            await tx.orm.public.SavingsAccount.where({ id: savAcc.id }).update({
              specialSavingsBalance: money(newCents),
            });
          }
        }
      }
      await tx.orm.public.SavingsTransaction.where({ id: stx.id }).select("id").delete();
    }

    // Rollback DPS Transactions
    const dpsTransactions: any[] = Array.isArray(collection.dpsTransactions)
      ? collection.dpsTransactions
      : [];
    for (const dtx of dpsTransactions) {
      if (dtx.dpsAccountId && dtx.type === "DEPOSIT") {
        const dpsAcc = await tx.orm.public.DpsAccount.select(
          "id",
          "totalPaidAmount",
          "paidInstallments",
          "status",
        ).first({ id: dtx.dpsAccountId });

        if (dpsAcc) {
          const dtxAmountCents = cents(dtx.amount);
          const currentTotalCents = cents(dpsAcc.totalPaidAmount);
          const newTotalCents = Math.max(0, currentTotalCents - dtxAmountCents);

          const dpsInstallments = await tx.orm.public.DpsInstallment.select(
            "id",
            "installmentNo",
            "amount",
            "paidAmount",
            "status",
          )
            .where({ dpsAccountId: dpsAcc.id })
            .orderBy((i: any) => i.installmentNo.desc())
            .all();

          let remainingToDeduct = dtxAmountCents;
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

          const { paidCount } = await tx.orm.public.DpsInstallment.where({
            dpsAccountId: dpsAcc.id,
            status: "PAID",
          }).aggregate((agg: any) => ({
            paidCount: agg.count(),
          }));

          await tx.orm.public.DpsAccount.where({ id: dpsAcc.id }).update({
            totalPaidAmount: money(newTotalCents),
            paidInstallments: Number(paidCount || 0),
            status: "ACTIVE",
          });
        }
      }
      await tx.orm.public.DpsTransaction.where({ id: dtx.id }).select("id").delete();
    }

    // Reverse Cash Ledger Entry in FinancialAccount
    const totalCents = cents(collection.totalAmount);
    if (totalCents > 0) {
      try {
        const defaultAccount =
          (await tx.orm.public.FinancialAccount.select("id")
            .first({ isDefault: true, isActive: true })) ||
          (await tx.orm.public.FinancialAccount.select("id")
            .first({ isActive: true }));

        if (defaultAccount) {
          await recordTransaction(tx, {
            accountId: defaultAccount.id,
            type: "CREDIT",
            amount: totalCents / 100,
            sourceModule: "LOAN_COLLECTION",
            referenceId: colCode,
            description: `Reversal of ${colCode}: ${reason}`,
            transactionDate: Temporal.Now.instant(),
            createdById: cancelledById,
          });
        }
      } catch (err) {
        console.warn("Could not record collection reversal in financial accounts:", err);
      }
    }

    // Delete Collection
    await tx.orm.public.Collection.where({ id: collection.id }).select("id").delete();

    return {
      kind: "SUCCESS" as const,
      collectionId: collection.id,
      collectionCode: colCode,
    };
  });
};

export const reverseLoanPayment = async (
  paymentId: number,
  reason: string,
  cancelledById: number,
) => {
  return db.transaction(async (tx) => {
    const payment = await tx.orm.public.LoanPayment.select(
      "id",
      "paymentId",
      "loanId",
      "installmentId",
      "amount",
      "collectionId",
    ).first({ id: paymentId });

    if (!payment) {
      return { kind: "NOT_FOUND" as const };
    }

    const payCode = payment.paymentId || `PAY-${String(payment.id).padStart(6, "0")}`;

    if (payment.installmentId && payment.loanId) {
      const inst = await tx.orm.public.LoanInstallment.select(
        "id",
        "paidAmount",
        "amount",
        "status",
      ).first({ id: payment.installmentId });

      if (inst) {
        const instPaidCents = cents(inst.paidAmount);
        const paymentCents = cents(payment.amount);
        const newPaidCents = Math.max(0, instPaidCents - paymentCents);
        const newStatus = newPaidCents === 0 ? "PENDING" : "PARTIAL";

        await tx.orm.public.LoanInstallment.where({ id: inst.id }).update({
          paidAmount: money(newPaidCents),
          status: newStatus,
          paidAt: null,
        });

        await tx.orm.public.Loan.where({ id: payment.loanId, status: "COMPLETED" }).update({
          status: "ACTIVE",
        });
      }
    }

    const amountCents = cents(payment.amount);
    if (amountCents > 0) {
      try {
        const defaultAccount =
          (await tx.orm.public.FinancialAccount.select("id")
            .first({ isDefault: true, isActive: true })) ||
          (await tx.orm.public.FinancialAccount.select("id")
            .first({ isActive: true }));

        if (defaultAccount) {
          await recordTransaction(tx, {
            accountId: defaultAccount.id,
            type: "CREDIT",
            amount: amountCents / 100,
            sourceModule: "LOAN_COLLECTION",
            referenceId: payCode,
            description: `Reversal of ${payCode}: ${reason}`,
            transactionDate: Temporal.Now.instant(),
            createdById: cancelledById,
          });
        }
      } catch (err) {
        console.warn("Could not record loan payment reversal in financial accounts:", err);
      }
    }

    await tx.orm.public.LoanPayment.where({ id: payment.id }).select("id").delete();

    return {
      kind: "SUCCESS" as const,
      paymentId: payment.id,
      paymentCode: payCode,
    };
  });
};
