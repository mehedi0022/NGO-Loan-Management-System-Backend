export type TransactionType = "INCOME" | "EXPENSE";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "MOBILE_PAYMENT"
  | "CHEQUE"
  | "OTHER";

export interface IncomeExpenseQuery {
  page?: number;
  limit?: number;
  type?: TransactionType | "ALL";
  categoryId?: number;
  somitiId?: number;
  paymentMethod?: PaymentMethod | "ALL";
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CategoryQuery {
  type?: TransactionType | "ALL";
  isActive?: boolean;
}

export interface CreateCategoryDTO {
  name: string;
  type: TransactionType;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  type?: TransactionType;
  description?: string;
  isActive?: boolean;
}

export interface CreateIncomeExpenseDTO {
  type: TransactionType;
  categoryId: number;
  amount: number;
  date?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  description?: string;
  somitiId?: number;
}

export interface UpdateIncomeExpenseDTO {
  categoryId?: number;
  amount?: number;
  date?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  description?: string;
  somitiId?: number;
}

export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeCount: number;
  expenseCount: number;
}
