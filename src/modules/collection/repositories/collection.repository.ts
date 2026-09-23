import { db } from "../../../prisma/db.js";
import { Temporal } from "temporal-polyfill";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";

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

  loanCollectionAmount: number;
  generalSavingsAmount: number;
  specialSavingsAmount: number;

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

  const totalAmount = loanAmount + generalAmount + specialAmount;

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
export const findDueInstallments = async (dueDate: Date) => {
  const date = toInstant(dueDate);

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
          member.select(
            "id",
            "memberId",
            "fullName",
            "mobileNumber",
            "photoUrl",
          ),
        ),
    )
    .where({
      dueDate: date,
    })
    .orderBy((installment) => installment.installmentNo.asc())
    .all();

  return installments.filter(
    (installment) =>
      installment.loan?.status === "ACTIVE" &&
      (installment.status === "PENDING" || installment.status === "PARTIAL"),
  );
};

/**
 * GET /collections
 */
export const findCollections = async (filters: {
  memberId?: number;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
}) => {
  const { memberId, fromDate, toDate, page, limit } = filters;

  let query = db.orm.public.Collection.select(
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
  ).include("member", (member) =>
    member.select("id", "memberId", "fullName", "mobileNumber", "photoUrl"),
  ).include("collectedBy", (user) =>
    user.select("id", "userName", "fullName"),
  );

  if (memberId) {
    query = query.where({
      memberId,
    });
  }

  if (fromDate) {
    query = query.where({
      collectionDate: {
        gte: toInstant(fromDate),
      },
    });
  }

  if (toDate) {
    query = query.where({
      collectionDate: {
        lte: toInstant(toDate),
      },
    });
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
