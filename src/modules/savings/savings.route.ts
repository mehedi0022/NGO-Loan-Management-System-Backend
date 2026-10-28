import { Router } from "express";

import { permissions } from "../../auth/authorization.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getMemberSavings,
  withdrawSavings,
  reverseSavingsTransaction,
} from "./controllers/savings.controller.js";
import {
  memberSavingsSchema,
  withdrawSavingsSchema,
  reverseSavingsTransactionSchema,
} from "./validations/savings.validation.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/members/:memberId",
  validate(memberSavingsSchema),
  requirePermission(permissions.savingsReadAny),
  getMemberSavings,
);

router.post(
  "/withdrawals",
  validate(withdrawSavingsSchema),
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
