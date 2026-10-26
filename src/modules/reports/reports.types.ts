export interface DailyCollectionReportQuery {
  startDate?: string;
  endDate?: string;
  somitiId?: number;
  fieldOfficerId?: number;
  collectedById?: number;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

export interface LoanPortfolioReportQuery {
  somitiId?: number;
  fieldOfficerId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface OverdueReportQuery {
  asOfDate?: string;
  somitiId?: number;
  fieldOfficerId?: number;
  minDaysOverdue?: number;
  page?: number;
  limit?: number;
}

export interface SavingsSummaryReportQuery {
  somitiId?: number;
  fieldOfficerId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ReportActor {
  userId: number;
  role: string;
}
