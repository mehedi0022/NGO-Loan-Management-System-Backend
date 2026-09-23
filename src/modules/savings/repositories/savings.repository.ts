import { Temporal } from "temporal-polyfill";

import { db } from "../../../prisma/db.js";
import type { WithdrawSavingsInput } from "../savings.types.js";

const cents = (value: string | number) => Math.round(Number(value) * 100);
const money = (value: number) => (value / 100).toFixed(2);
const toInstant = (date: Date) => Temporal.Instant.from(date.toISOString());

export const findMemberSavings = async (memberId: number) =>
  db.orm.public.Member.select(
    "id",
    "memberId",
    "fullName",
    "mobileNumber",
    "photoUrl",
    "status",
  )
    .include("savingsAccount", (account) =>
      account.select(
        "id",
        "accountId",
        "generalSavingsBalance",
        "specialSavingsBalance",
        "status",
        "openedAt",
        "closedAt",
        "notes",
      ),
    )
    .first({ id: memberId });

export type WithdrawalResult =
  | { kind: "SUCCESS"; transactionId: number; accountId: number }
  | {
      kind:
        | "NO_MEMBER"
        | "NO_ACCOUNT"
        | "ACCOUNT_CLOSED"
        | "INSUFFICIENT_BALANCE"
        | "CONCURRENT";
    };

export const withdrawSavings = async (
  data: WithdrawSavingsInput,
  processedById: number,
): Promise<WithdrawalResult> =>
  db.transaction(async (tx) => {
    const member = await tx.orm.public.Member.select("id").first({
      id: data.memberId,
    });

    if (!member) return { kind: "NO_MEMBER" };

    const account = await tx.orm.public.SavingsAccount.select(
      "id",
      "status",
      "generalSavingsBalance",
      "specialSavingsBalance",
    ).first({ memberId: data.memberId });

    if (!account) return { kind: "NO_ACCOUNT" };
    if (account.status !== "ACTIVE") return { kind: "ACCOUNT_CLOSED" };

    const withdrawalAmount = cents(data.amount);
    const currentValue =
      data.savingsType === "GENERAL"
        ? account.generalSavingsBalance
        : account.specialSavingsBalance;
    const currentBalance = cents(currentValue);

    if (withdrawalAmount > currentBalance) {
      return { kind: "INSUFFICIENT_BALANCE" };
    }

    const nextBalance = currentBalance - withdrawalAmount;
    const updated =
      data.savingsType === "GENERAL"
        ? await tx.orm.public.SavingsAccount.where({
            id: account.id,
            status: "ACTIVE",
            generalSavingsBalance: account.generalSavingsBalance,
          }).update({ generalSavingsBalance: money(nextBalance) })
        : await tx.orm.public.SavingsAccount.where({
            id: account.id,
            status: "ACTIVE",
            specialSavingsBalance: account.specialSavingsBalance,
          }).update({ specialSavingsBalance: money(nextBalance) });

    if (!updated) return { kind: "CONCURRENT" };

    const transaction = await tx.orm.public.SavingsTransaction.create({
      savingsAccountId: account.id,
      processedById,
      savingsType: data.savingsType,
      type: "WITHDRAWAL",
      amount: money(withdrawalAmount),
      balanceBefore: money(currentBalance),
      balanceAfter: money(nextBalance),
      transactionDate: toInstant(data.transactionDate),
      paymentMethod: data.paymentMethod,
      reference: data.reference || null,
      notes: data.notes || null,
    });

    await tx.orm.public.SavingsTransaction.where({ id: transaction.id }).update({
      transactionId: `STX-${String(transaction.id).padStart(6, "0")}`,
    });

    return {
      kind: "SUCCESS",
      transactionId: transaction.id,
      accountId: account.id,
    };
  });
