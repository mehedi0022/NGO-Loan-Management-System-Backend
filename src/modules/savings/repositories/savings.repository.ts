import { Temporal } from "temporal-polyfill";

import { db } from "../../../prisma/db.js";
import { recordTransaction } from "../../accounts/repositories/accounts.repository.js";
import { assertBusinessDateNotClosed, assertCanReverseTransaction } from "../../day-closing/services/day-closing.service.js";
import { getActiveBusinessDay } from "../../day-closing/repositories/day-closing.repository.js";
import type { WithdrawSavingsInput } from "../savings.types.js";

const cents = (value: string | number) => Math.round(Number(value) * 100);
const money = (value: number) => (value / 100).toFixed(2);
const toInstant = (date: Date) => Temporal.Instant.from(date.toISOString());

export const findMemberSavings = async (memberId: number) => {
  const member = await db.orm.public.Member.select(
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

  if (!member) return null;

  if (!member.savingsAccount) {
    const createdAccount = await db.orm.public.SavingsAccount.create({
      memberId: member.id,
      generalSavingsBalance: "0.00",
      specialSavingsBalance: "0.00",
      status: "ACTIVE",
    });
    const accountId = `SAV-${String(createdAccount.id).padStart(6, "0")}`;
    await db.orm.public.SavingsAccount.where({ id: createdAccount.id }).update({
      accountId,
    });
    return {
      ...member,
      savingsAccount: {
        id: createdAccount.id,
        accountId,
        generalSavingsBalance: "0.00",
        specialSavingsBalance: "0.00",
        status: "ACTIVE",
        openedAt: createdAccount.openedAt,
        closedAt: null,
        notes: null,
      },
    };
  }

  return member;
};

export type WithdrawalResult =
  | { kind: "SUCCESS"; transactionId: number; accountId: number }
  | {
      kind:
        | "NO_MEMBER"
        | "NO_ACCOUNT"
        | "ACCOUNT_CLOSED"
        | "INSUFFICIENT_BALANCE"
        | "CONCURRENT"
        | "NO_ORG_ACCOUNT";
    }
  | {
      kind: "INSUFFICIENT_ORG_BALANCE";
      accountName: string;
      availableBalance: number;
      requiredAmount: number;
      shortage: number;
    };

export const withdrawSavings = async (
  data: WithdrawSavingsInput,
  processedById: number,
): Promise<WithdrawalResult> => {
  const activeDay = await getActiveBusinessDay();
  const effectiveDateStr = data.transactionDate
    ? (data.transactionDate instanceof Date
        ? data.transactionDate.toISOString().slice(0, 10)
        : String(data.transactionDate).slice(0, 10))
    : activeDay.businessDate;
  await assertBusinessDateNotClosed(effectiveDateStr);

  return db.transaction(async (tx) => {
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

    // Check organization financial account balance before proceeding with payout
    const payoutAccount = data.accountId
      ? await tx.orm.public.FinancialAccount.select(
          "id",
          "accountName",
          "currentBalance",
          "isActive",
        ).first({ id: data.accountId, isActive: true })
      : (await tx.orm.public.FinancialAccount.select(
          "id",
          "accountName",
          "currentBalance",
          "isActive",
        ).first({ isDefault: true, isActive: true })) ||
        (await tx.orm.public.FinancialAccount.select(
          "id",
          "accountName",
          "currentBalance",
          "isActive",
        ).first({ isActive: true }));

    if (!payoutAccount) {
      return { kind: "NO_ORG_ACCOUNT" };
    }

    const availableOrgBalance = Number(payoutAccount.currentBalance) || 0;
    const requiredPayoutAmount = Number(data.amount) || 0;
    if (availableOrgBalance < requiredPayoutAmount) {
      return {
        kind: "INSUFFICIENT_ORG_BALANCE",
        accountName: payoutAccount.accountName,
        availableBalance: availableOrgBalance,
        requiredAmount: requiredPayoutAmount,
        shortage: requiredPayoutAmount - availableOrgBalance,
      };
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

    const transactionId = `STX-${String(transaction.id).padStart(6, "0")}`;
    await tx.orm.public.SavingsTransaction.where({ id: transaction.id }).update({
      transactionId,
    });

    // Record in cash accounting ledger
    if (requiredPayoutAmount > 0) {
      await recordTransaction(tx, {
        accountId: payoutAccount.id,
        type: "CREDIT",
        amount: requiredPayoutAmount,
        sourceModule: "SAVINGS_WITHDRAWAL",
        referenceId: transactionId,
        description: `Savings withdrawal (${data.savingsType}) for member #${data.memberId}`,
        transactionDate: toInstant(data.transactionDate),
        createdById: processedById,
      });
    }

    return {
      kind: "SUCCESS",
      transactionId: transaction.id,
      accountId: account.id,
    };
  });
};

export const reverseSavingsTransaction = async (
  transactionId: number,
  reason: string,
  cancelledById: number,
) => {
  return db.transaction(async (tx) => {
    const transaction = await tx.orm.public.SavingsTransaction.select(
      "id",
      "transactionId",
      "savingsAccountId",
      "savingsType",
      "type",
      "amount",
      "collectionId",
      "transactionDate",
    ).first({ id: transactionId });

    if (!transaction) {
      return { kind: "NOT_FOUND" as const };
    }

    const txCode =
      transaction.transactionId ||
      `STX-${String(transaction.id).padStart(6, "0")}`;

    // Ensure reversals are strictly forbidden on closed business days
    await assertCanReverseTransaction(transaction.transactionDate, txCode);

    const account = await tx.orm.public.SavingsAccount.select(
      "id",
      "generalSavingsBalance",
      "specialSavingsBalance",
    ).first({ id: transaction.savingsAccountId });

    if (!account) {
      return { kind: "NO_ACCOUNT" as const };
    }

    const txAmountCents = cents(transaction.amount);

    if (transaction.type === "DEPOSIT") {
      // Reversing a deposit -> Deduct from savings balance & CREDIT cash ledger
      if (transaction.savingsType === "GENERAL") {
        const currentCents = cents(account.generalSavingsBalance);
        const newCents = Math.max(0, currentCents - txAmountCents);
        await tx.orm.public.SavingsAccount.where({ id: account.id }).update({
          generalSavingsBalance: money(newCents),
        });
      } else {
        const currentCents = cents(account.specialSavingsBalance);
        const newCents = Math.max(0, currentCents - txAmountCents);
        await tx.orm.public.SavingsAccount.where({ id: account.id }).update({
          specialSavingsBalance: money(newCents),
        });
      }

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
            sourceModule: "SAVINGS_DEPOSIT",
            referenceId: txCode,
            description: `Reversal of Deposit ${txCode}: ${reason}`,
            transactionDate: Temporal.Now.instant(),
            createdById: cancelledById,
          });
        }
      } catch (err) {
        console.warn("Could not record savings deposit reversal in accounts:", err);
      }
    } else if (transaction.type === "WITHDRAWAL") {
      // Reversing a withdrawal -> Add back to savings balance & DEBIT cash ledger
      if (transaction.savingsType === "GENERAL") {
        const currentCents = cents(account.generalSavingsBalance);
        const newCents = currentCents + txAmountCents;
        await tx.orm.public.SavingsAccount.where({ id: account.id }).update({
          generalSavingsBalance: money(newCents),
        });
      } else {
        const currentCents = cents(account.specialSavingsBalance);
        const newCents = currentCents + txAmountCents;
        await tx.orm.public.SavingsAccount.where({ id: account.id }).update({
          specialSavingsBalance: money(newCents),
        });
      }

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
            type: "DEBIT",
            amount: txAmountCents / 100,
            sourceModule: "SAVINGS_WITHDRAWAL",
            referenceId: txCode,
            description: `Reversal of Withdrawal ${txCode}: ${reason}`,
            transactionDate: Temporal.Now.instant(),
            createdById: cancelledById,
          });
        }
      } catch (err) {
        console.warn("Could not record savings withdrawal reversal in accounts:", err);
      }
    }

    // Delete SavingsTransaction
    await tx.orm.public.SavingsTransaction.where({ id: transaction.id }).select("id").delete();

    return {
      kind: "SUCCESS" as const,
      transactionId: transaction.id,
      transactionCode: txCode,
    };
  });
};

export const checkInterestPeriodValidity = async (
  startDate: string,
  endDate: string,
) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  if (startDate > endDate) {
    return {
      isValid: false,
      kind: "INVALID_DATES" as const,
      message: "Start date cannot be after end date.",
    };
  }

  if (endDate > todayStr) {
    return {
      isValid: false,
      kind: "FUTURE_DATE" as const,
      message: `Cannot calculate or post interest for future dates (Current date: ${todayStr}).`,
    };
  }

  // Check overlap against existing SavingsInterestPosting
  const existingPostings = await db.orm.public.SavingsInterestPosting.select(
    "id",
    "postingCode",
    "periodStartDate",
    "periodEndDate",
  ).all();

  for (const p of existingPostings) {
    const pStart = p.periodStartDate.toString().slice(0, 10);
    const pEnd = p.periodEndDate.toString().slice(0, 10);
    // Two intervals [A, B] and [C, D] overlap if A <= D and B >= C
    if (startDate <= pEnd && endDate >= pStart) {
      return {
        isValid: false,
        kind: "OVERLAP" as const,
        message: `Interest has already been posted for period ${pStart} to ${pEnd} (Posting Code: ${p.postingCode || `#${p.id}`}). Overlapping interest posting is prohibited.`,
        overlappingPosting: {
          id: p.id,
          postingCode: p.postingCode,
          periodStartDate: pStart,
          periodEndDate: pEnd,
        },
      };
    }
  }

  let lastPostedEndDate: string | null = null;
  let lastPostingCode: string | null = null;
  for (const p of existingPostings) {
    const pEnd = p.periodEndDate.toString().slice(0, 10);
    if (!lastPostedEndDate || pEnd > lastPostedEndDate) {
      lastPostedEndDate = pEnd;
      lastPostingCode = p.postingCode;
    }
  }

  let nextEligibleStartDate: string | null = null;
  if (lastPostedEndDate) {
    const d = new Date(lastPostedEndDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    nextEligibleStartDate = d.toISOString().slice(0, 10);

    if (startDate > nextEligibleStartDate) {
      return {
        isValid: true,
        kind: "GAP_WARNING" as const,
        warning: `Notice: Previous posting ended on ${lastPostedEndDate}. Starting from ${startDate} leaves an uncredited gap. Recommended start date is ${nextEligibleStartDate}.`,
        nextEligibleStartDate,
        lastPostedEndDate,
      };
    }
  }

  // Find earliest account opening date across all active accounts
  const allAccounts = await db.orm.public.SavingsAccount.select(
    "id",
    "openedAt",
    "createdAt",
  )
    .include("member", (m: any) => m.select("joinDate", "createdAt"))
    .where({ status: "ACTIVE" })
    .all();

  let earliestOrganizationDate: string | null = null;
  for (const a of allAccounts) {
    const raw = a.openedAt || (a as any).member?.joinDate || a.createdAt;
    if (raw) {
      const dStr = (typeof raw === "string" ? raw : raw.toString()).slice(0, 10);
      if (!earliestOrganizationDate || dStr < earliestOrganizationDate) {
        earliestOrganizationDate = dStr;
      }
    }
  }

  // If no previous posting exists, start date cannot be before earliest account opened in organization
  if (!lastPostedEndDate && earliestOrganizationDate) {
    if (startDate < earliestOrganizationDate) {
      return {
        isValid: false,
        kind: "BEFORE_EARLIEST_ACCOUNT" as const,
        message: `Start date (${startDate}) cannot be earlier than the first savings account opened in the organization (${earliestOrganizationDate}).`,
        earliestOrganizationDate,
      };
    }
  }

  return {
    isValid: true,
    kind: "VALID" as const,
    nextEligibleStartDate,
    lastPostedEndDate,
    lastPostingCode,
    earliestOrganizationDate,
  };
};

export const getSavingsInterestSettings = async () => {
  const setting = await db.orm.public.OrganizationSetting.select(
    "id",
    "generalSavingsInterestRate",
    "specialSavingsInterestRate",
    "savingsCompoundingInterval",
  ).first();

  const postings = await db.orm.public.SavingsInterestPosting.select(
    "id",
    "postingCode",
    "periodStartDate",
    "periodEndDate",
    "createdAt",
  ).all();

  let lastPosting: any = null;
  let lastPostedEndDate: string | null = null;
  for (const p of postings) {
    const pEnd = p.periodEndDate.toString().slice(0, 10);
    if (!lastPostedEndDate || pEnd > lastPostedEndDate) {
      lastPostedEndDate = pEnd;
      lastPosting = {
        id: p.id,
        postingCode: p.postingCode,
        periodStartDate: p.periodStartDate.toString().slice(0, 10),
        periodEndDate: pEnd,
        createdAt: p.createdAt,
      };
    }
  }

  let nextEligibleStartDate: string | null = null;
  if (lastPostedEndDate) {
    const d = new Date(lastPostedEndDate + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    nextEligibleStartDate = d.toISOString().slice(0, 10);
  }

  // Find earliest account opening date across all active accounts
  const allAccounts = await db.orm.public.SavingsAccount.select(
    "id",
    "openedAt",
    "createdAt",
  )
    .include("member", (m: any) => m.select("joinDate", "createdAt"))
    .where({ status: "ACTIVE" })
    .all();

  let earliestOrganizationDate: string | null = null;
  for (const a of allAccounts) {
    const raw = a.openedAt || (a as any).member?.joinDate || a.createdAt;
    if (raw) {
      const dStr = (typeof raw === "string" ? raw : raw.toString()).slice(0, 10);
      if (!earliestOrganizationDate || dStr < earliestOrganizationDate) {
        earliestOrganizationDate = dStr;
      }
    }
  }

  return {
    generalSavingsInterestRate: Number(setting?.generalSavingsInterestRate ?? 6),
    specialSavingsInterestRate: Number(setting?.specialSavingsInterestRate ?? 7),
    savingsCompoundingInterval: setting?.savingsCompoundingInterval ?? "QUARTERLY",
    lastPosting,
    nextEligibleStartDate,
    earliestOrganizationDate,
    today: new Date().toISOString().slice(0, 10),
  };
};

export const updateSavingsInterestSettings = async (input: {
  generalSavingsInterestRate: number;
  specialSavingsInterestRate: number;
  savingsCompoundingInterval: string;
}) => {
  const setting = await db.orm.public.OrganizationSetting.select("id").first();
  if (setting) {
    await db.orm.public.OrganizationSetting.where({ id: setting.id }).update({
      generalSavingsInterestRate: String(input.generalSavingsInterestRate),
      specialSavingsInterestRate: String(input.specialSavingsInterestRate),
      savingsCompoundingInterval: input.savingsCompoundingInterval,
    });
  }
  return input;
};

export interface CalculateInterestOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  generalSavingsRate?: number;
  specialSavingsRate?: number;
  somitiId?: number;
  compoundingInterval?: string;
}

export const calculateDailyProductInterest = async (
  options: CalculateInterestOptions,
) => {
  // 1. Get rates from settings if not passed
  const settings = await getSavingsInterestSettings();
  const genRate = options.generalSavingsRate ?? settings.generalSavingsInterestRate;
  const spcRate = options.specialSavingsRate ?? settings.specialSavingsInterestRate;

  // 2. Validate dates and check overlap
  const validity = await checkInterestPeriodValidity(options.startDate, options.endDate);
  if (!validity.isValid) {
    return {
      periodStartDate: options.startDate,
      periodEndDate: options.endDate,
      totalDays: 0,
      generalSavingsRate: genRate,
      specialSavingsRate: spcRate,
      compoundingInterval: options.compoundingInterval || settings.savingsCompoundingInterval,
      totalEligibleMembers: 0,
      totalGeneralInterest: 0,
      totalSpecialInterest: 0,
      grandTotalInterest: 0,
      accounts: [],
      validationError: validity.message,
      validationKind: validity.kind,
      warning: undefined,
    };
  }

  const endInstant = Temporal.Instant.from(`${options.endDate}T23:59:59.999Z`);

  // Calculate total days inclusive: e.g. 2026-07-01 to 2026-09-30 = 92 days
  const sDateOnly = new Date(options.startDate + "T00:00:00Z");
  const eDateOnly = new Date(options.endDate + "T00:00:00Z");
  const totalDays = Math.max(
    1,
    Math.round((eDateOnly.getTime() - sDateOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );

  // 2. Fetch active savings accounts
  const query = db.orm.public.SavingsAccount.select(
    "id",
    "accountId",
    "memberId",
    "generalSavingsBalance",
    "specialSavingsBalance",
    "status",
    "openedAt",
    "createdAt",
  )
    .include("member", (member: any) =>
      member
        .select(
          "id",
          "memberId",
          "fullName",
          "mobileNumber",
          "joinDate",
          "somitiId",
        )
        .include("somiti", (somiti: any) =>
          somiti.select("id", "name", "code"),
        ),
    )
    .where({ status: "ACTIVE" });

  const accounts = await query.all();

  // Filter by somitiId if provided
  const filteredAccounts = options.somitiId
    ? accounts.filter((acc: any) => acc.member?.somitiId === options.somitiId)
    : accounts;

  // 3. For each account, compute daily product
  const calculatedAccounts = [];
  let grandTotalGeneralInterest = 0;
  let grandTotalSpecialInterest = 0;

  for (const acc of filteredAccounts) {
    // Fetch transactions up to endInstant, ordered by transactionDate asc
    const transactions = await db.orm.public.SavingsTransaction.select(
      "id",
      "savingsType",
      "type",
      "amount",
      "balanceBefore",
      "balanceAfter",
      "transactionDate",
    )
      .where({ savingsAccountId: acc.id })
      .where((t: any) => t.transactionDate.lte(endInstant))
      .orderBy((t: any) => t.transactionDate.asc())
      .all();

    // Group transactions by date string YYYY-MM-DD
    const txByDateAndType = new Map<string, { genLastAfter?: number; spcLastAfter?: number }>();

    // Baseline balances right before startDate
    const genTxList = transactions.filter((t: any) => t.savingsType === "GENERAL");
    const spcTxList = transactions.filter((t: any) => t.savingsType === "SPECIAL");

    const genBeforeList = genTxList.filter(
      (tx: any) => tx.transactionDate.toString().slice(0, 10) < options.startDate,
    );
    let startingGenBal = 0;
    if (genBeforeList.length > 0) {
      startingGenBal = Number(genBeforeList[genBeforeList.length - 1].balanceAfter) || 0;
    } else if (genTxList.length > 0) {
      startingGenBal = Number(genTxList[0].balanceBefore) || 0;
    } else {
      // If no transaction records exist, baseline is current balance
      startingGenBal = Number(acc.generalSavingsBalance) || 0;
    }

    const spcBeforeList = spcTxList.filter(
      (tx: any) => tx.transactionDate.toString().slice(0, 10) < options.startDate,
    );
    let startingSpcBal = 0;
    if (spcBeforeList.length > 0) {
      startingSpcBal = Number(spcBeforeList[spcBeforeList.length - 1].balanceAfter) || 0;
    } else if (spcTxList.length > 0) {
      startingSpcBal = Number(spcTxList[0].balanceBefore) || 0;
    } else {
      // If no transaction records exist, baseline is current balance
      startingSpcBal = Number(acc.specialSavingsBalance) || 0;
    }

    for (const tx of transactions) {
      const txDateStr = tx.transactionDate.toString().slice(0, 10);
      const isBeforeStart = txDateStr < options.startDate;
      const afterAmt = Number(tx.balanceAfter) || 0;

      if (!isBeforeStart) {
        const existing = txByDateAndType.get(txDateStr) || {};
        if (tx.savingsType === "GENERAL") existing.genLastAfter = afterAmt;
        if (tx.savingsType === "SPECIAL") existing.spcLastAfter = afterAmt;
        txByDateAndType.set(txDateStr, existing);
      }
    }

    // Member account opening date
    const rawOpen = acc.openedAt || (acc as any).member?.joinDate || acc.createdAt;
    const accountOpenDateStr = rawOpen
      ? (typeof rawOpen === "string" ? rawOpen : rawOpen.toString()).slice(0, 10)
      : null;

    // Check if account was already opened on or before options.startDate
    const isOpenAtStart = !accountOpenDateStr || accountOpenDateStr <= options.startDate;

    // Iterate through every single day from startDate to endDate
    // If account was not opened yet at startDate, balance is strictly 0 until opening date
    let curGenBal = isOpenAtStart ? startingGenBal : 0;
    let curSpcBal = isOpenAtStart ? startingSpcBal : 0;
    let sumGenProducts = 0;
    let sumSpcProducts = 0;
    let activeDays = 0;

    const curr = new Date(options.startDate + "T00:00:00Z");
    for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
      const dateStr = curr.toISOString().slice(0, 10);
      const isAccountOpenOnDate = !accountOpenDateStr || dateStr >= accountOpenDateStr;

      if (isAccountOpenOnDate) {
        // If account opened on this exact date during the calculation period, activate baseline balance
        if (!isOpenAtStart && dateStr === accountOpenDateStr && curGenBal === 0 && curSpcBal === 0) {
          curGenBal = startingGenBal;
          curSpcBal = startingSpcBal;
        }

        const txInfo = txByDateAndType.get(dateStr);
        if (txInfo) {
          if (typeof txInfo.genLastAfter === "number") curGenBal = txInfo.genLastAfter;
          if (typeof txInfo.spcLastAfter === "number") curSpcBal = txInfo.spcLastAfter;
        }

        sumGenProducts += curGenBal;
        sumSpcProducts += curSpcBal;
        activeDays++;
      }

      // Advance by 1 day
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    // Daily Product formula: (Sum of Daily Balances * Annual Rate) / (365 * 100)
    const genInterest = (sumGenProducts * genRate) / 36500;
    const spcInterest = (sumSpcProducts * spcRate) / 36500;

    const roundedGenInterest = Math.round(genInterest * 100) / 100;
    const roundedSpcInterest = Math.round(spcInterest * 100) / 100;
    const totalInterest = Math.round((roundedGenInterest + roundedSpcInterest) * 100) / 100;

    const avgGenBalance = Math.round((sumGenProducts / totalDays) * 100) / 100;
    const avgSpcBalance = Math.round((sumSpcProducts / totalDays) * 100) / 100;

    if (
      totalInterest > 0 ||
      Number(acc.generalSavingsBalance) > 0 ||
      Number(acc.specialSavingsBalance) > 0
    ) {
      grandTotalGeneralInterest += roundedGenInterest;
      grandTotalSpecialInterest += roundedSpcInterest;

      const m = (acc as any).member;
      calculatedAccounts.push({
        savingsAccountId: acc.id,
        accountId: acc.accountId || `SAV-${String(acc.id).padStart(6, "0")}`,
        memberId: m?.id,
        memberCode: m?.memberId || `MEM-${acc.memberId}`,
        fullName: m?.fullName || "—",
        mobileNumber: m?.mobileNumber || "—",
        somitiName: m?.somiti?.name || "General",
        accountOpenDate: accountOpenDateStr,
        activeDays,
        totalPeriodDays: totalDays,
        currentGeneralBalance: Number(acc.generalSavingsBalance) || 0,
        currentSpecialBalance: Number(acc.specialSavingsBalance) || 0,
        avgGeneralBalance: avgGenBalance,
        avgSpecialBalance: avgSpcBalance,
        generalInterest: roundedGenInterest,
        specialInterest: roundedSpcInterest,
        totalInterest,
      });
    }
  }

  grandTotalGeneralInterest = Math.round(grandTotalGeneralInterest * 100) / 100;
  grandTotalSpecialInterest = Math.round(grandTotalSpecialInterest * 100) / 100;
  const grandTotalInterest =
    Math.round((grandTotalGeneralInterest + grandTotalSpecialInterest) * 100) / 100;

  return {
    periodStartDate: options.startDate,
    periodEndDate: options.endDate,
    totalDays,
    generalSavingsRate: genRate,
    specialSavingsRate: spcRate,
    compoundingInterval: options.compoundingInterval || settings.savingsCompoundingInterval,
    totalEligibleMembers: calculatedAccounts.length,
    totalGeneralInterest: grandTotalGeneralInterest,
    totalSpecialInterest: grandTotalSpecialInterest,
    grandTotalInterest,
    accounts: calculatedAccounts,
    warning: validity.warning,
  };
};

export const postSavingsInterest = async (
  options: CalculateInterestOptions & { notes?: string },
  postedById: number,
) => {
  // 1. Strict Overlap and Future Date Validation
  const validity = await checkInterestPeriodValidity(options.startDate, options.endDate);
  if (!validity.isValid) {
    return {
      kind: validity.kind,
      message: validity.message,
    };
  }

  const calculation = await calculateDailyProductInterest(options);

  if (calculation.validationError) {
    return {
      kind: (calculation.validationKind || "VALIDATION_ERROR") as any,
      message: calculation.validationError,
    };
  }

  if (calculation.grandTotalInterest <= 0) {
    return {
      kind: "NO_INTEREST" as const,
      message: "No interest was accrued for the selected period.",
      calculation,
    };
  }

  return db.transaction(async (tx) => {
    // Generate unique posting code: SIP-YYYYMMDD-XXXX
    const datePrefix = options.endDate.replace(/-/g, "");
    const countToday = (await tx.orm.public.SavingsInterestPosting.aggregate((agg: any) => ({
      count: agg.count(),
    }))) as any;
    const postingSeq = String((Number(countToday?.count) || 0) + 1).padStart(4, "0");
    const postingCode = `SIP-${datePrefix}-${postingSeq}`;

    let accountsCreditedCount = 0;

    for (const accData of calculation.accounts) {
      if (accData.totalInterest <= 0) continue;

      const account = await tx.orm.public.SavingsAccount.select(
        "id",
        "generalSavingsBalance",
        "specialSavingsBalance",
      ).first({ id: accData.savingsAccountId });

      if (!account) continue;

      let newGenBal = Number(account.generalSavingsBalance);
      let newSpcBal = Number(account.specialSavingsBalance);

      // 1. Post General Savings Interest if > 0
      if (accData.generalInterest > 0) {
        const genBefore = newGenBal;
        newGenBal = Math.round((newGenBal + accData.generalInterest) * 100) / 100;

        await tx.orm.public.SavingsAccount.where({ id: account.id }).update({
          generalSavingsBalance: money(cents(newGenBal)),
        });

        const stxGen = await tx.orm.public.SavingsTransaction.create({
          savingsAccountId: account.id,
          processedById: postedById,
          savingsType: "GENERAL",
          type: "INTEREST",
          amount: money(cents(accData.generalInterest)),
          balanceBefore: money(cents(genBefore)),
          balanceAfter: money(cents(newGenBal)),
          transactionDate: toInstant(new Date(options.endDate + "T23:59:59Z")),
          paymentMethod: "OTHER",
          reference: postingCode,
          notes: `Interest @ ${calculation.generalSavingsRate}% p.a. for ${options.startDate} to ${options.endDate} (${calculation.compoundingInterval})`,
        });

        const stxGenId = `STX-${String(stxGen.id).padStart(6, "0")}`;
        await tx.orm.public.SavingsTransaction.where({ id: stxGen.id }).update({
          transactionId: stxGenId,
        });
      }

      // 2. Post Special Savings Interest if > 0
      if (accData.specialInterest > 0) {
        const spcBefore = newSpcBal;
        newSpcBal = Math.round((newSpcBal + accData.specialInterest) * 100) / 100;

        await tx.orm.public.SavingsAccount.where({ id: account.id }).update({
          specialSavingsBalance: money(cents(newSpcBal)),
        });

        const stxSpc = await tx.orm.public.SavingsTransaction.create({
          savingsAccountId: account.id,
          processedById: postedById,
          savingsType: "SPECIAL",
          type: "INTEREST",
          amount: money(cents(accData.specialInterest)),
          balanceBefore: money(cents(spcBefore)),
          balanceAfter: money(cents(newSpcBal)),
          transactionDate: toInstant(new Date(options.endDate + "T23:59:59Z")),
          paymentMethod: "OTHER",
          reference: postingCode,
          notes: `Interest @ ${calculation.specialSavingsRate}% p.a. for ${options.startDate} to ${options.endDate} (${calculation.compoundingInterval})`,
        });

        const stxSpcId = `STX-${String(stxSpc.id).padStart(6, "0")}`;
        await tx.orm.public.SavingsTransaction.where({ id: stxSpc.id }).update({
          transactionId: stxSpcId,
        });
      }

      accountsCreditedCount++;
    }

    // 3. Create SavingsInterestPosting record
    const postingRecord = await tx.orm.public.SavingsInterestPosting.create({
      postingCode,
      periodStartDate: toInstant(new Date(options.startDate + "T00:00:00Z")),
      periodEndDate: toInstant(new Date(options.endDate + "T23:59:59Z")),
      compoundingInterval: calculation.compoundingInterval,
      generalSavingsRate: String(calculation.generalSavingsRate),
      specialSavingsRate: String(calculation.specialSavingsRate),
      totalGeneralInterest: String(calculation.totalGeneralInterest),
      totalSpecialInterest: String(calculation.totalSpecialInterest),
      totalAccountsCredited: accountsCreditedCount,
      postedById,
      notes: options.notes || null,
    });

    return {
      kind: "SUCCESS" as const,
      postingId: postingRecord.id,
      postingCode,
      calculation,
      accountsCreditedCount,
    };
  });
};

export const getInterestPostingHistory = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const [{ total }, records] = await Promise.all([
    db.orm.public.SavingsInterestPosting.aggregate((agg: any) => ({ total: agg.count() })),
    db.orm.public.SavingsInterestPosting.select(
      "id",
      "postingCode",
      "periodStartDate",
      "periodEndDate",
      "compoundingInterval",
      "generalSavingsRate",
      "specialSavingsRate",
      "totalGeneralInterest",
      "totalSpecialInterest",
      "totalAccountsCredited",
      "notes",
      "createdAt",
    )
      .include("postedBy", (user: any) => user.select("id", "fullName", "userName"))
      .orderBy((r: any) => r.createdAt.desc())
      .offset(offset)
      .limit(limit)
      .all(),
  ]);

  const totalCount = Number(total) || 0;
  return {
    records,
    meta: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
};
