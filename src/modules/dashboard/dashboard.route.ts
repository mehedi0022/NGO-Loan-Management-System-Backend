import { Router } from "express";

import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { getDashboardSummary } from "./controllers/dashboard.controller.js";
import { dashboardSummaryQuerySchema } from "./validations/dashboard.validation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/summary",
  validate(dashboardSummaryQuerySchema),
  requirePermission(permissions.dashboardRead),
  getDashboardSummary,
);

export default router;
