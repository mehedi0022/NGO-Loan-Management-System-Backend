import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import {
  createCategory,
  createIncomeExpense,
  deleteCategory,
  deleteIncomeExpense,
  getCategories,
  getCategoryById,
  getIncomeExpenseById,
  getIncomeExpenseList,
  updateCategory,
} from "./controllers/income-expense.controller.js";
import {
  categoryQuerySchema,
  createCategorySchema,
  createIncomeExpenseSchema,
  incomeExpenseQuerySchema,
  updateCategorySchema,
} from "./validations/income-expense.validation.js";

const router = Router();

router.use(requireAuth);

// ----------------------------------------------------------------------------------
// Category Endpoints
// ----------------------------------------------------------------------------------
router.get(
  "/categories",
  validate(categoryQuerySchema),
  requirePermission(permissions.incomeExpenseReadAny),
  getCategories,
);

router.get(
  "/categories/:id",
  requirePermission(permissions.incomeExpenseReadAny),
  getCategoryById,
);

router.post(
  "/categories",
  validate(createCategorySchema),
  requirePermission(permissions.incomeExpenseCreate),
  createCategory,
);

router.patch(
  "/categories/:id",
  validate(updateCategorySchema),
  requirePermission(permissions.incomeExpenseUpdateAny),
  updateCategory,
);

router.delete(
  "/categories/:id",
  requirePermission(permissions.incomeExpenseDeleteAny),
  deleteCategory,
);

// ----------------------------------------------------------------------------------
// Income & Expense Voucher Endpoints
// ----------------------------------------------------------------------------------
router.get(
  "/",
  validate(incomeExpenseQuerySchema),
  requirePermission(permissions.incomeExpenseReadAny),
  getIncomeExpenseList,
);

router.get(
  "/:id",
  requirePermission(permissions.incomeExpenseReadAny),
  getIncomeExpenseById,
);

router.post(
  "/",
  validate(createIncomeExpenseSchema),
  requirePermission(permissions.incomeExpenseCreate),
  createIncomeExpense,
);

router.post(
  "/:id/reverse",
  requirePermission(permissions.incomeExpenseDeleteAny),
  deleteIncomeExpense,
);

router.delete(
  "/:id",
  requirePermission(permissions.incomeExpenseDeleteAny),
  deleteIncomeExpense,
);

export const incomeExpenseRoutes = router;
