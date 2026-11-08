export type BusinessDayStatus = "OPEN" | "CLOSED";

export interface DayClosingRecord {
  id: number;
  businessDate: string; // ISO date string YYYY-MM-DD
  status: BusinessDayStatus;
  openingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  closingBalance: number;

  loanCollection: number;
  savingsDeposit: number;
  dpsDeposit: number;
  admissionFee: number;
  capitalReceived: number;
  otherIncome: number;

  loanDisbursed: number;
  savingsWithdrawn: number;
  dpsWithdrawn: number;
  officeExpense: number;

  isHoliday: boolean;
  notes?: string | null;

  openedAt: string;
  closedAt?: string | null;
  closedById?: number | null;
  closedBy?: {
    id: number;
    fullName: string | null;
    userName: string | null;
  } | null;
}

export interface DayClosingPreview {
  businessDate: string;
  status: BusinessDayStatus;
  isDeferred: boolean; // true if businessDate < today's calendar date
  calendarDate: string; // actual today's date in Asia/Dhaka
  openingBalance: number;
  cashIn: {
    loanCollection: number;
    savingsDeposit: number;
    dpsDeposit: number;
    admissionFee: number;
    capitalReceived: number;
    otherIncome: number;
    total: number;
  };
  cashOut: {
    loanDisbursed: number;
    savingsWithdrawn: number;
    dpsWithdrawn: number;
    officeExpense: number;
    total: number;
  };
  closingBalance: number;
  totalTransactionsCount: number;
  suggestedNextDate: string; // usually businessDate + 1, or skip weekend
}

export interface ExecuteDayClosingInput {
  notes?: string;
  nextBusinessDate?: string; // YYYY-MM-DD
  isNextDayHoliday?: boolean; // if true, skip or mark holiday
}

export interface ListDayClosingsQuery {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  status?: BusinessDayStatus;
}
