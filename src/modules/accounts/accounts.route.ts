import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import {
  createAccount,
  getAccountById,
  getAccounts,
  getDailyCashSheet,
  getProfitLossStatement,
  getTransactions,
  injectCapital,
  transferFunds,
  updateAccount,
} from "./controllers/accounts.controller.js";
import {
  accountIdParamSchema,
  createAccountSchema,
  dailyCashSheetQuerySchema,
  injectCapitalSchema,
  listTransactionsQuerySchema,
  profitLossQuerySchema,
  transferFundsSchema,
  updateAccountSchema,
} from "./validations/accounts.validation.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission(permissions.accountsReadAny), getAccounts);

router.post(
  "/",
  validate(createAccountSchema),
  requirePermission(permissions.accountsCreate),
  createAccount,
);

router.get(
  ["/daily-sheet", "/daily-cash-sheet"],
  validate(dailyCashSheetQuerySchema),
  requirePermission(permissions.accountsReadAny),
  getDailyCashSheet,
);

router.get(
  "/profit-loss",
  validate(profitLossQuerySchema),
  requirePermission(permissions.accountsReadAny),
  getProfitLossStatement,
);

router.get(
  "/transactions",
  validate(listTransactionsQuerySchema),
  requirePermission(permissions.accountsReadAny),
  getTransactions,
);

router.post(
  "/transfer",
  validate(transferFundsSchema),
  requirePermission(permissions.accountsTransfer),
  transferFunds,
);

router.post(
  ["/capital", "/inject-capital"],
  validate(injectCapitalSchema),
  requirePermission(permissions.accountsTransfer),
  injectCapital,
);

router.get(
  "/:id",
  validate(accountIdParamSchema),
  requirePermission(permissions.accountsReadAny),
  getAccountById,
);

router.patch(
  "/:id",
  validate(updateAccountSchema),
  requirePermission(permissions.accountsUpdateAny),
  updateAccount,
);

export default router;
