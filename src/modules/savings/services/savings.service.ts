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
