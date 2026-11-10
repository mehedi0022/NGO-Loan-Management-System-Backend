import { Router } from "express";

import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { guardBusinessDayNotClosed } from "../../middlewares/business-day.guard.js";
import {
  getMemberSavings,
  getSavingsWithdrawals,
  withdrawSavings,
  reverseSavingsTransaction,
  getSavingsInterestSettings,
  updateSavingsInterestSettings,
  previewSavingsInterest,
  postSavingsInterest,
  getInterestPostingHistory,
} from "./controllers/savings.controller.js";
import {
  listSavingsWithdrawalsSchema,
  memberSavingsSchema,
  withdrawSavingsSchema,
  reverseSavingsTransactionSchema,
  previewInterestSchema,
  postInterestSchema,
  updateSavingsInterestSettingsSchema,
} from "./validations/savings.validation.js";

const router = Router();
router.use(requireAuth);

// Savings Interest Management
router.get(
  "/interest/settings",
  requirePermission(permissions.savingsReadAny),
  getSavingsInterestSettings,
);

router.put(
  "/interest/settings",
  validate(updateSavingsInterestSettingsSchema),
  requirePermission(permissions.savingsReverse),
  updateSavingsInterestSettings,
);

router.get(
  "/interest/preview",
  validate(previewInterestSchema),
  requirePermission(permissions.savingsReadAny),
  previewSavingsInterest,
);

router.post(
  "/interest/post",
  validate(postInterestSchema),
  requirePermission(permissions.savingsReverse),
  postSavingsInterest,
);

router.get(
  "/interest/history",
  requirePermission(permissions.savingsReadAny),
  getInterestPostingHistory,
);

router.get(
  "/members/:memberId",
  validate(memberSavingsSchema),
  requirePermission(permissions.savingsReadAny),
  getMemberSavings,
);

router.get(
  "/withdrawals",
  validate(listSavingsWithdrawalsSchema),
  requirePermission(permissions.savingsReadAny),
  getSavingsWithdrawals,
);

router.post(
  "/withdrawals",
  validate(withdrawSavingsSchema),
  guardBusinessDayNotClosed((req) => req.body?.transactionDate),
  requirePermission(permissions.savingsWithdraw),
  withdrawSavings,
);

router.post(
  "/transactions/:transactionId/reverse",
  validate(reverseSavingsTransactionSchema),
  requirePermission(permissions.savingsReverse),
  reverseSavingsTransaction,
);

export default router;
