import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../errors/AppError.js";
import * as dpsRepository from "./dps.repository.js";
import type {
  CreateDpsAccountInput,
  DepositDpsInput,
  CloseDpsInput,
  DpsListQuery,
} from "./dps.types.js";

export const createDpsAccount = async (
  input: CreateDpsAccountInput,
  openedById: number,
) => {
  const result = await dpsRepository.createDpsAccount(input, openedById);
  if (result.kind === "NO_MEMBER") throw new NotFoundError("Member not found");
  if (result.kind === "MEMBER_INACTIVE") throw new ValidationError("Member is not active");
  return result;
};

export const getDpsAccounts = async (query: DpsListQuery) => {
  return dpsRepository.findDpsAccounts(query);
};

export const getDpsAccountById = async (id: number) => {
  const account = await dpsRepository.findDpsAccountById(id);
  if (!account) throw new NotFoundError("DPS account not found");
  return account;
};

export const depositDpsInstallment = async (
  id: number,
  input: DepositDpsInput,
  processedById: number,
) => {
  const result = await dpsRepository.depositDpsInstallment(id, input, processedById);
  if (result.kind === "NO_ACCOUNT") throw new NotFoundError("DPS account not found");
  if (result.kind === "ACCOUNT_NOT_ACTIVE") throw new ConflictError("DPS account is not active");
  return result;
};

export const closeDpsAccount = async (
  id: number,
  input: CloseDpsInput,
  processedById: number,
) => {
  const result = await dpsRepository.closeDpsAccount(id, input, processedById);
  if (result.kind === "NO_ACCOUNT") throw new NotFoundError("DPS account not found");
  if (result.kind === "ALREADY_CLOSED") throw new ConflictError("DPS account is already closed");
  return result;
};

export const calculateDpsMaturity = (
  installmentAmount: number,
  durationMonths: number,
  interestRate: number,
  frequency: "WEEKLY" | "MONTHLY" = "MONTHLY",
) => {
  return dpsRepository.calculateDpsMaturity(installmentAmount, durationMonths, interestRate, frequency);
};

export const reverseDpsTransaction = async (
  transactionId: number,
  reason: string,
  cancelledById: number,
) => {
  const result = await dpsRepository.reverseDpsTransaction(
    transactionId,
    reason,
    cancelledById,
  );
  if (result.kind === "NOT_FOUND") throw new NotFoundError("DPS transaction not found");
  if (result.kind === "NO_ACCOUNT") throw new NotFoundError("DPS account not found");
  return result;
};
