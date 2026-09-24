import type { Request, Response } from "express";

import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";

import * as userService from "../services/user.service.js";

import type { UserListQuery } from "../validations/user.validation.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.middleware.js";

/**
 * Get current authenticated user
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).auth;

  const user = await userService.getCurrentUser(userId);

  res
    .status(200)
    .json(successResponse("Current user fetched successfully", user));
});

/**
 * Create user
 */
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.auth!.role, req.body);

  res.status(201).json(successResponse("User created successfully", user));
});

/**
 * Get all users
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getAllUsers(
    req.query as unknown as UserListQuery,
  );

  res
    .status(200)
    .json(
      paginatedResponse(
        "Users fetched successfully",
        result.users,
        result.meta,
      ),
    );
});

/**
 * Get user by ID
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(Number(req.params.id));

  res.status(200).json(successResponse("User fetched successfully", user));
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(
    req.auth!,
    Number(req.params.id),
    req.body,
  );

  res.status(200).json(successResponse("User updated successfully", user));
});

export const changeUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.changeUserRole(
      req.auth!,
      Number(req.params.id),
      req.body.role,
    );

    res.status(200).json(successResponse("User role updated successfully", user));
  },
);

export const changeUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await userService.changeUserStatus(
      req.auth!,
      Number(req.params.id),
      req.body.isActive,
    );

    res.status(200).json(successResponse("User status updated successfully", user));
  },
);

export const resetUserPassword = asyncHandler(
  async (req: Request, res: Response) => {
    await userService.resetUserPassword(
      req.auth!,
      Number(req.params.id),
      req.body.newPassword,
    );

    res.status(200).json(
      successResponse(
        "User password reset successfully. Existing sessions were revoked.",
        null,
      ),
    );
  },
);

