import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.middleware.js";
import * as service from "../services/income-expense.service.js";
import type {
  CategoryQuery,
  CreateCategoryDTO,
  CreateIncomeExpenseDTO,
  IncomeExpenseQuery,
  UpdateCategoryDTO,
  UpdateIncomeExpenseDTO,
} from "../income-expense.types.js";

// ----------------------------------------------------------------------------------
// Category Controllers
// ----------------------------------------------------------------------------------

export const getCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const categories = await service.getCategories(
      req.query as unknown as CategoryQuery,
    );
    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  },
);

export const getCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const category = await service.getCategoryById(id);
    return res.status(200).json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  },
);

export const createCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await service.createCategory(
      req.body as CreateCategoryDTO,
    );
    return res.status(201).json({
      success: true,
      message: "Transaction category created successfully",
      data: category,
    });
  },
);

export const updateCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const category = await service.updateCategory(
      id,
      req.body as UpdateCategoryDTO,
    );
    return res.status(200).json({
      success: true,
      message: "Transaction category updated successfully",
      data: category,
    });
  },
);

export const deleteCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await service.deleteCategory(id);
    return res.status(200).json({
      success: true,
      message: "Transaction category deleted successfully",
      data: result,
    });
  },
);

// ----------------------------------------------------------------------------------
// Income & Expense Voucher Controllers
// ----------------------------------------------------------------------------------

export const getIncomeExpenseList = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const result = await service.getIncomeExpenseList(
      req.query as unknown as IncomeExpenseQuery,
      auth,
    );
    return res.status(200).json({
      success: true,
      message: "Income and expense transactions fetched successfully",
      data: result.records,
      summary: result.summary,
      meta: result.meta,
    });
  },
);

export const getIncomeExpenseById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const record = await service.getIncomeExpenseById(id);
    return res.status(200).json({
      success: true,
      message: "Voucher transaction fetched successfully",
      data: record,
    });
  },
);

export const createIncomeExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const auth = (req as AuthenticatedRequest).auth;
    const record = await service.createIncomeExpense(
      req.body as CreateIncomeExpenseDTO,
      auth,
    );
    return res.status(201).json({
      success: true,
      message: `${req.body.type === "INCOME" ? "Income" : "Expense"} voucher created successfully`,
      data: record,
    });
  },
);

export const updateIncomeExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const record = await service.updateIncomeExpense(
      id,
      req.body as UpdateIncomeExpenseDTO,
    );
    return res.status(200).json({
      success: true,
      message: "Voucher transaction updated successfully",
      data: record,
    });
  },
);

export const deleteIncomeExpense = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await service.deleteIncomeExpense(id);
    return res.status(200).json({
      success: true,
      message: "Voucher transaction deleted successfully",
      data: result,
    });
  },
);
