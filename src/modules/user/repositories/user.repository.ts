import { db } from "../../../prisma/db.js";
import { toPublicUserDto } from "../user.dto.js";
import type { UserListQuery } from "../validations/user.validation.js";
import { pageOffset, paginationMeta } from "../../../utils/pagination.js";
import type { UserRole } from "../../../auth/roles.js";
import { Temporal } from "temporal-polyfill";
import { or } from "@prisma/orm-postgres/orm-client";

type CreateUserData = {
  userName: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

export const findUserIdByEmail = (email: string) =>
  db.orm.public.User.select("id").first({ email });

export const findUserByEmail = async (email: string) => {
  return db.orm.public.User
    .select(
      "id",
      "email",
      "userName",
      "fullName",
      "password",
      "role",
      "isActive",
      "emailVerifiedAt",
      "createdAt",
      "updatedAt",
    )
    .first({ email });
};

export const findAllUsers = async ({
  page,
  limit,
  role,
  status,
  search,
  sortBy,
  sortOrder,
}: UserListQuery) => {
  const selectedUsers = db.orm.public.User
    .select("id", "email", "userName", "fullName", "role", "isActive", "emailVerifiedAt", "createdAt", "updatedAt");
  let filteredUsers = selectedUsers;

  if (role) {
    filteredUsers = filteredUsers.where({ role });
  }

  if (status) {
    filteredUsers = filteredUsers.where({ isActive: status === "ACTIVE" });
  }

  if (search) {
    const term = `%${search}%`;
    filteredUsers = filteredUsers.where((user) =>
      or(
        user.fullName.ilike(term),
        user.userName.ilike(term),
        user.email.ilike(term),
      ),
    );
  }

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
      case "fullName":
        return filteredUsers.orderBy([
          (user) => sortOrder === "asc" ? user.fullName.asc() : user.fullName.desc(),
          (user) => user.id.asc(),
        ]);
      case "role":
        return filteredUsers.orderBy([
          (user) => sortOrder === "asc" ? user.role.asc() : user.role.desc(),
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
    .select("id", "email", "userName", "fullName", "role", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .create({
      userName: data.userName,
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
    });

  return toPublicUserDto(user);
};

export const findAuthorizationUserById = (id: number) =>
  db.orm.public.User.select("id", "role", "isActive").first({ id });

export const findUserById = async (id: number) => {
  const user = await db.orm.public.User
    .select("id", "email", "userName", "fullName", "role", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .first({ id });
  return user ? toPublicUserDto(user) : null;
};

export const updateUserById = async (
  id: number,
  data: { userName?: string | null; fullName?: string | null },
) => {
  const user = await db.orm.public.User
    .where({ id })
    .select("id", "email", "userName", "fullName", "role", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .update(data);
  return user ? toPublicUserDto(user) : null;
};

export const countActiveSuperAdmins = async () => {
  const result = await db.orm.public.User
    .where({ role: "SUPER_ADMIN", isActive: true })
    .aggregate((aggregate) => ({ count: aggregate.count() }));
  return result.count;
};

export const updateUserRoleById = async (id: number, role: UserRole) => {
  const user = await db.orm.public.User
    .where({ id })
    .select("id", "email", "userName", "fullName", "role", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .update({ role });
  return user ? toPublicUserDto(user) : null;
};

export const updateUserStatusAndRevokeSessions = async (
  id: number,
  isActive: boolean,
) => db.transaction(async (tx) => {
  const user = await tx.orm.public.User
    .where({ id })
    .select("id", "email", "userName", "fullName", "role", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    .update({ isActive });

  if (!user) return null;

  if (!isActive) {
    const revokedAt = Temporal.Now.instant();
    while (
      await tx.orm.public.Session
        .where({ userId: id, revokedAt: null })
        .select("id")
        .update({ revokedAt })
    ) {
      // The ORM updates one row at a time; exhaust every active session.
    }
  }

  return toPublicUserDto(user);
});

