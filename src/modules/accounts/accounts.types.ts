export type FinancialAccountType = "CASH" | "BANK" | "MOBILE_BANKING";
export type AccountTransactionType = "DEBIT" | "CREDIT";
export type AccountSourceModule =
  | "CAPITAL_INJECTION"
  | "MEMBER_ADMISSION"
  | "LOAN_DISBURSEMENT"
  | "LOAN_COLLECTION"
  | "SAVINGS_DEPOSIT"
  | "SAVINGS_WITHDRAWAL"
  | "DPS_DEPOSIT"
  | "DPS_WITHDRAWAL"
  | "OFFICE_EXPENSE"
  | "OTHER_INCOME"
  | "FUND_TRANSFER";

export interface CreateAccountInput {
  accountName: string;
  accountType?: FinancialAccountType;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  initialBalance?: number;
  isDefault?: boolean;
  notes?: string;
}

export interface UpdateAccountInput {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  isActive?: boolean;
  isDefault?: boolean;
  notes?: string;
}

export interface TransferFundsInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  transferDate?: string;
  notes?: string;
}

export interface InjectCapitalInput {
  accountId: number;
  amount: number;
  source?: string;
  depositDate?: string;
  notes?: string;
}

export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  accountId?: number;
  type?: AccountTransactionType;
  sourceModule?: AccountSourceModule;
  fromDate?: string;
  toDate?: string;
}

export interface DailyCashSheetQuery {
  date?: string;
  accountId?: number;
}

export interface ProfitLossQuery {
  fromDate?: string;
  toDate?: string;
}
