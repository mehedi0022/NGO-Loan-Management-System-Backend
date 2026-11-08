import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../errors/AppError.js";
import * as repository from "../repositories/savings.repository.js";
import type { WithdrawSavingsInput } from "../savings.types.js";

export const getMemberSavings = async (memberId: number) => {
  const member = await repository.findMemberSavings(memberId);
  if (!member) throw new NotFoundError("Member not found");
  return member;
};

export const withdrawSavings = async (
  data: WithdrawSavingsInput,
  processedById: number,
) => {
  const result = await repository.withdrawSavings(data, processedById);

  switch (result.kind) {
    case "NO_MEMBER":
      throw new NotFoundError("Member not found");
    case "NO_ACCOUNT":
      throw new NotFoundError("Savings account not found");
    case "ACCOUNT_CLOSED":
      throw new ConflictError("Savings account is closed");
    case "INSUFFICIENT_BALANCE":
      throw new ValidationError(
        `Insufficient ${data.savingsType.toLowerCase()} savings balance`,
      );
    case "CONCURRENT":
      throw new ConflictError(
        "Savings balance changed while processing; please review and retry",
      );
    case "SUCCESS":
      return result;
  }
};

export const reverseSavingsTransaction = async (
  transactionId: number,
  reason: string,
  cancelledById: number,
) => {
  const result = await repository.reverseSavingsTransaction(
    transactionId,
    reason,
    cancelledById,
  );

  if (result.kind === "NOT_FOUND") {
    throw new NotFoundError("Savings transaction not found");
  }

  if (result.kind === "NO_ACCOUNT") {
    throw new NotFoundError("Savings account not found");
  }

  return result;
};

export const getSavingsInterestSettings = async () => {
  return repository.getSavingsInterestSettings();
};

export const updateSavingsInterestSettings = async (input: {
  generalSavingsInterestRate: number;
  specialSavingsInterestRate: number;
  savingsCompoundingInterval: string;
}) => {
  return repository.updateSavingsInterestSettings(input);
};

export const previewSavingsInterest = async (options: repository.CalculateInterestOptions) => {
  return repository.calculateDailyProductInterest(options);
};

export const postSavingsInterest = async (
  options: repository.CalculateInterestOptions & { notes?: string },
  postedById: number,
) => {
  const result: any = await repository.postSavingsInterest(options, postedById);
  if (result.kind === "NO_INTEREST") {
    throw new ValidationError(result.message);
  }
  if (result.kind === "OVERLAP") {
    throw new ConflictError(result.message);
  }
  if (
    result.kind === "FUTURE_DATE" ||
    result.kind === "INVALID_DATES" ||
    result.kind === "VALIDATION_ERROR"
  ) {
    throw new ValidationError(result.message);
  }
  return result;
};

export const getInterestPostingHistory = async (page = 1, limit = 20) => {
  return repository.getInterestPostingHistory(page, limit);
};
