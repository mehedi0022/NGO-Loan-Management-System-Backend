import * as repository from "../repositories/reports.repository.js";
import type {
  DailyCollectionReportQuery,
  LoanPortfolioReportQuery,
  OverdueReportQuery,
  ReportActor,
  SavingsSummaryReportQuery,
  DpsSummaryReportQuery,
} from "../reports.types.js";

export const getDailyCollectionsReport = async (
  query: DailyCollectionReportQuery,
  actor?: ReportActor,
) => {
  const fieldOfficerId =
    actor?.role === "FIELD_OFFICER" ? actor.userId : query.fieldOfficerId;

  return repository.getDailyCollectionsReport({
    ...query,
    fieldOfficerId,
  });
};

export const getLoanPortfolioReport = async (
  query: LoanPortfolioReportQuery,
  actor?: ReportActor,
) => {
  const fieldOfficerId =
    actor?.role === "FIELD_OFFICER" ? actor.userId : query.fieldOfficerId;

  return repository.getLoanPortfolioReport({
    ...query,
    fieldOfficerId,
  });
};

export const getOverdueInstallmentsReport = async (
  query: OverdueReportQuery,
  actor?: ReportActor,
) => {
  const fieldOfficerId =
    actor?.role === "FIELD_OFFICER" ? actor.userId : query.fieldOfficerId;

  return repository.getOverdueInstallmentsReport({
    ...query,
    fieldOfficerId,
  });
};

export const getSavingsSummaryReport = async (
  query: SavingsSummaryReportQuery,
  actor?: ReportActor,
) => {
  const fieldOfficerId =
    actor?.role === "FIELD_OFFICER" ? actor.userId : query.fieldOfficerId;

  return repository.getSavingsSummaryReport({
    ...query,
    fieldOfficerId,
  });
};

export const getDpsSummaryReport = async (
  query: DpsSummaryReportQuery,
  actor?: ReportActor,
) => {
  const fieldOfficerId =
    actor?.role === "FIELD_OFFICER" ? actor.userId : query.fieldOfficerId;

  return repository.getDpsSummaryReport({
    ...query,
    fieldOfficerId,
  });
};
