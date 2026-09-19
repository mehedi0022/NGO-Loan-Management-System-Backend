import * as userRepository from "../repositories/user.repository.js";
import { NotFoundError } from "../../../errors/AppError.js";
import type { UserListQuery } from "../validations/user.validation.js";

export const getAllUsers = async (query: UserListQuery) => {
  return userRepository.findAllUsers(query);
};

export const getUserById = async (id: number) => {
  const user = await userRepository.findUserById(id);
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const updateUser = async (
  id: number,
  data: { userName?: string | null; fullName?: string | null },
) => {
  const user = await userRepository.updateUserById(id, data);
  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const deleteUser = async (id: number) => {
  const user = await userRepository.deleteUserById(id);
  if (!user) throw new NotFoundError("User not found");
};
