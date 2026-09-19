import type { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { paginatedResponse, successResponse } from "../../../utils/api-response.js";
import * as userService from "../services/user.service.js";
import type { UserListQuery } from "../validations/user.validation.js";

export const getAllUsers = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await userService.getAllUsers(req.query as unknown as UserListQuery);

    res.status(200).json(paginatedResponse("Users fetched successfully", result.users, result.meta));
  },
);

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(Number(req.params.id));
  res.status(200).json(successResponse("User fetched successfully", user));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(Number(req.params.id), req.body);
  res.status(200).json(successResponse("User updated successfully", user));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUser(Number(req.params.id));
  res.status(204).send();
});
