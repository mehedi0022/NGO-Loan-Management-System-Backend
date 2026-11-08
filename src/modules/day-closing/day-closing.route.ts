import { Router } from "express";
import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  executeDayClosing,
  getActiveBusinessDay,
  getDayClosingPreview,
  listDayClosings,
} from "./controllers/day-closing.controller.js";
import {
  executeDayClosingSchema,
  listDayClosingsQuerySchema,
} from "./validations/day-closing.validation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/active",
  requirePermission(permissions.dayClosingRead),
  getActiveBusinessDay,
);

router.get(
  "/preview",
  requirePermission(permissions.dayClosingRead),
  getDayClosingPreview,
);

router.post(
  "/close",
  validate(executeDayClosingSchema),
  requirePermission(permissions.dayClosingExecute),
  executeDayClosing,
);

router.get(
  "/history",
  validate(listDayClosingsQuerySchema),
  requirePermission(permissions.dayClosingRead),
  listDayClosings,
);

export default router;
