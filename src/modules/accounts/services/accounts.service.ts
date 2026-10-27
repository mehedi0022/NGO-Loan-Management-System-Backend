import { NotFoundError, ValidationError } from "../../../errors/AppError.js";
import * as accountsRepository from "../repositories/accounts.repository.js";
import type {
  CreateAccountInput,
  DailyCashSheetQuery,
  InjectCapitalInput,
  ListTransactionsQuery,
  ProfitLossQuery,
  TransferFundsInput,
  UpdateAccountInput,
} from "../accounts.types.js";

export const listAccounts = async () => {
  return await accountsRepository.listAccounts();
};

export const getAccountById = async (id: number) => {
  const account = await accountsRepository.getAccountById(id);
  if (!account) {
    throw new NotFoundError("Financial account not found");
  }
  return account;
};

export const createAccount = async (data: CreateAccountInput, userId?: number) => {
  return await accountsRepository.createAccount(data, userId);
};

export const updateAccount = async (id: number, data: UpdateAccountInput) => {
  const existing = await accountsRepository.getAccountById(id);
  if (!existing) {
    throw new NotFoundError("Financial account not found");
  }
  return await accountsRepository.updateAccount(id, data);
};

export const transferFunds = async (input: TransferFundsInput, userId?: number) => {
  if (input.fromAccountId === input.toAccountId) {
    throw new ValidationError("Source and destination accounts must be different");
  }
  return await accountsRepository.transferFunds(input, userId);
};

export const injectCapital = async (input: InjectCapitalInput, userId?: number) => {
  return await accountsRepository.injectCapital(input, userId);
};

export const listTransactions = async (query: ListTransactionsQuery) => {
  return await accountsRepository.listTransactions(query);
};

export const getDailyCashSheet = async (query: DailyCashSheetQuery) => {
  return await accountsRepository.getDailyCashSheet(query);
};

export const getProfitLossStatement = async (query: ProfitLossQuery) => {
  return await accountsRepository.getProfitLossStatement(query);
};
