import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";

import {
  createLoan,
  getAllLoans,
  getLoanById,
  updateLoan,
  approveLoan,
  rejectLoan,
  disburseLoan,
} from "./controllers/loan.controller.js";
import {
  createLoanSchema,
  loanIdSchema,
  loanListQuerySchema,
  updateLoanSchema,
  rejectLoanSchema,
  disburseLoanSchema,
} from "./validations/loan.validation.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  validate(loanListQuerySchema),
  requirePermission(permissions.loansReadAny),
  getAllLoans,
);

router.get(
  "/:id",
  validate(loanIdSchema),
  requirePermission(permissions.loansReadAny),
  getLoanById,
);

router.post(
  "/",
  validate(createLoanSchema),
  requirePermission(permissions.loansCreate),
  createLoan,
);

router.patch(
  "/:id",
  validate(updateLoanSchema),
  requirePermission(permissions.loansUpdateAny),
  updateLoan,
);
router.patch("/:id/approve", validate(loanIdSchema), requirePermission(permissions.loansApprove), approveLoan);
router.patch("/:id/reject", validate(rejectLoanSchema), requirePermission(permissions.loansApprove), rejectLoan);
router.post("/:id/disburse", validate(disburseLoanSchema), requirePermission(permissions.loansDisburse), disburseLoan);

export default router;
