import { db } from "../../../prisma/db.js";
import { toPublicUserDto } from "../user.dto.js";
import type { UserListQuery } from "../validations/user.validation.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";

type CreateUserData = {
  userName: string;
  fullName: string;
  email: string;
  password: string;
};

export const findUserByEmail = async (email: string) => {
  return db.orm.public.User
    .select(
      "id",
      "email",
      "userName",
      "fullName",
      "password",
      "role",
      "emailVerifiedAt",
      "createdAt",
      "updatedAt",
    )
    .first({ email });
};

export const findAllUsers = async ({ page, limit, role, sortBy, sortOrder }: UserListQuery) => {
  const selectedUsers = db.orm.public.User
    .select("id", "email", "userName", "fullName", "role", "emailVerifiedAt", "createdAt", "updatedAt");
  const filteredUsers = role ? selectedUsers.where({ role }) : selectedUsers;
  const offset = pageOffset(page, limit);
  const usersQuery = (() => {
    switch (sortBy) {
      case "id":
        return filteredUsers.orderBy((user) => sortOrder === "asc" ? user.id.asc() : user.id.desc());
      case "email":
        return filteredUsers.orderBy([
          (user) => sortOrder === "asc" ? user.email.asc() : user.email.desc(),
          (user) => user.id.asc(),
        ]);
      case "userName":
        return filteredUsers.orderBy([
          (user) => sortOrder === "asc" ? user.userName.asc() : user.userName.desc(),
          (user) => user.id.asc(),
        ]);
      case "createdAt":
        return filteredUsers.orderBy([
          (user) => sortOrder === "asc" ? user.createdAt.asc() : user.createdAt.desc(),
          (user) => user.id.desc(),
        ]);
    }
  })();
  const [{ total }, users] = await Promise.all([
    filteredUsers.aggregate((aggregate) => ({ total: aggregate.count() })),
    usersQuery.offset(offset).limit(limit).all(),
  ]);

  return {
    users: users.map(toPublicUserDto),
    meta: paginationMeta(page, limit, total),
  };
};

export const createUser = async (data: CreateUserData) => {
  const user = await db.orm.public.User
    .select("id", "email", "userName", "fullName", "role", "emailVerifiedAt", "createdAt", "updatedAt")
    .create({
      userName: data.userName,
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    });

  return toPublicUserDto(user);
};

export const findAuthorizationUserById = (id: number) =>
  db.orm.public.User.select("id", "role").first({ id });

export const findUserById = async (id: number) => {
  const user = await db.orm.public.User
    .select("id", "email", "userName", "fullName", "role", "emailVerifiedAt", "createdAt", "updatedAt")
    .first({ id });
  return user ? toPublicUserDto(user) : null;
};

export const updateUserById = async (
  id: number,
  data: { userName?: string | null; fullName?: string | null },
) => {
  const user = await db.orm.public.User
    .where({ id })
    .select("id", "email", "userName", "fullName", "role", "emailVerifiedAt", "createdAt", "updatedAt")
    .update(data);
  return user ? toPublicUserDto(user) : null;
};

export const updatePasswordById = async (id: number, password: string) =>
  db.orm.public.User.where({ id }).select("id").update({ password });

export const deleteUserById = async (id: number) => {
  const user = await db.orm.public.User
    .where({ id })
    .select("id", "email", "userName", "fullName", "role", "emailVerifiedAt", "createdAt", "updatedAt")
    .delete();
  return user ? toPublicUserDto(user) : null;
};
