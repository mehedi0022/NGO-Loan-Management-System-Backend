import { Router } from "express";
import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createDpsAccount,
  getDpsAccounts,
  getDpsAccountById,
  depositDpsInstallment,
  closeDpsAccount,
  calculateDpsMaturity,
  reverseDpsTransaction,
} from "./dps.controller.js";
import {
  createDpsAccountSchema,
  depositDpsSchema,
  closeDpsSchema,
  dpsListQuerySchema,
  dpsIdParamsSchema,
  reverseDpsTransactionSchema,
} from "./dps.validation.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/calculator",
  calculateDpsMaturity,
);

router.post(
  "/transactions/:transactionId/reverse",
  validate(reverseDpsTransactionSchema),
  requirePermission(permissions.dpsReverse),
  reverseDpsTransaction,
);

router.post(
  "/",
  validate(createDpsAccountSchema),
  requirePermission(permissions.dpsCreate),
  createDpsAccount,
);

router.get(
  "/",
  validate(dpsListQuerySchema),
  requirePermission(permissions.dpsReadAny),
  getDpsAccounts,
);

router.get(
  "/:id",
  validate(dpsIdParamsSchema),
  requirePermission(permissions.dpsReadAny),
  getDpsAccountById,
);

router.post(
  "/:id/deposit",
  validate(depositDpsSchema),
  requirePermission(permissions.dpsDeposit),
  depositDpsInstallment,
);

router.post(
  "/:id/close",
  validate(closeDpsSchema),
  requirePermission(permissions.dpsClose),
  closeDpsAccount,
);

export default router;
