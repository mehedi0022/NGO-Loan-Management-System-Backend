import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import {
  getDailyCollectionsReport,
  getLoanPortfolioReport,
  getOverdueInstallmentsReport,
  getSavingsSummaryReport,
} from "./controllers/reports.controller.js";
import {
  dailyCollectionReportSchema,
  loanPortfolioReportSchema,
  overdueReportSchema,
  savingsSummaryReportSchema,
} from "./validations/reports.validation.js";

const router = Router();

router.use(requireAuth);
router.use(requirePermission(permissions.reportsReadAny));

router.get(
  "/daily-collections",
  validate(dailyCollectionReportSchema),
  getDailyCollectionsReport,
);

router.get(
  "/loan-portfolio",
  validate(loanPortfolioReportSchema),
  getLoanPortfolioReport,
);

router.get(
  "/overdue",
  validate(overdueReportSchema),
  getOverdueInstallmentsReport,
);

router.get(
  "/savings-summary",
  validate(savingsSummaryReportSchema),
  getSavingsSummaryReport,
);

export default router;
